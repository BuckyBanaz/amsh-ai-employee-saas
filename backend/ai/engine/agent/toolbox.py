"""Agent toolbox: the only way the LLM can touch data. Every tool
  - gets business_id / caller_number / call_id from the runtime, never from LLM arguments,
  - returns a small JSON dict the LLM can explain naturally,
  - writes only after the ActionGate says the caller confirmed.
`dry_run=True` (shadow mode) validates everything but persists nothing and never transfers."""

import asyncio
import json
import logging
from datetime import date, datetime
from typing import Any, Callable, Dict, List, Optional, Set

from sqlalchemy.orm import Session

from backend.ai.capabilities.operations.clinic.booking_guard import existing_appointment_conflict
from backend.ai.capabilities.operations.clinic.slot_availability import BLOCKING_STATUSES
from backend.ai.capabilities.operations.registry import get_operations
from backend.ai.engine.agent.availability import Booked, booked_from_appointments, day_ranges, open_slots
from backend.ai.engine.agent.datetime_utils import dates_in, format_time, parse_date, parse_time, speak_date
from backend.ai.engine.agent.grounding import SUCCESS_CODES, times_in
from backend.ai.engine.agent.validator import (
    ActionGate,
    BusinessFacts,
    check_confirmation,
    describe,
    err,
    explicit_human_request,
    ground_booking,
    is_affirmative,
    no_doctor_preference,
    normalize_booking,
    normalize_phone,
    same_phone,
    slot_floor,
    validate_slot,
    match_doctor,
)
from backend.ai.tools.framework.base import ToolContext
from backend.ai.prompts import load_prompts


def _msg(key: str, **fmt) -> str:
    """Model-facing message from ai/prompts/engine_notes.json ("messages"); `fmt` fills the {placeholders}."""
    group, name = key.split(".", 1)
    text = load_prompts("engine_notes")["messages"][group][name]
    return text.format(**fmt) if fmt else text.replace("{{", "{").replace("}}", "}")

logger = logging.getLogger(__name__)

_DATE = {"type": "string", "description": _msg("toolbox.tools.param.date_example")}
_TIME = {"type": "string", "description": "with AM/PM, e.g. 5:30 PM"}
_CONFIRMED = {"type": "boolean", "description": _msg("toolbox.tools.param.confirmed_by_caller")}


def _fn(name: str, description: str, properties: Dict[str, Any], required: List[str]) -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties, "required": required},
        },
    }


TOOL_SCHEMAS: List[Dict[str, Any]] = [
    _fn(
        "check_availability",
        _msg("toolbox.tools.check_availability"),
        {"date": _DATE, "doctor_name": {"type": "string"}, "time": {"type": "string", "description": "test one time"}},
        ["date"],
    ),
    _fn(
        "book_appointment",
        _msg("toolbox.tools.book_appointment"),
        {
            "patient_name": {"type": "string"},
            "phone_number": {"type": "string"},
            "preferred_date": _DATE,
            "preferred_time": _TIME,
            "service_name": {"type": "string"},
            "doctor_name": {"type": "string"},
            "confirmed_by_caller": _CONFIRMED,
        },
        ["patient_name", "phone_number", "preferred_date", "preferred_time", "confirmed_by_caller"],
    ),
    _fn(
        "lookup_appointment",
        _msg("toolbox.tools.lookup_appointment"),
        {"phone_number": {"type": "string"}},
        ["phone_number"],
    ),
    _fn(
        "cancel_appointment",
        _msg("toolbox.tools.cancel_appointment"),
        {"ref": {"type": "string"}, "confirmed_by_caller": _CONFIRMED},
        ["ref", "confirmed_by_caller"],
    ),
    _fn(
        "reschedule_appointment",
        _msg("toolbox.tools.reschedule_appointment"),
        {"ref": {"type": "string"}, "new_date": _DATE, "new_time": _TIME, "confirmed_by_caller": _CONFIRMED},
        ["ref", "new_date", "new_time", "confirmed_by_caller"],
    ),
    _fn("search_knowledge", _msg("toolbox.tools.search_knowledge"), {"query": {"type": "string"}}, ["query"]),
    _fn(
        "transfer_to_human",
        _msg("toolbox.tools.transfer_to_human"),
        {"department": {"type": "string"}, "reason": {"type": "string"}, "confirmed_by_caller": _CONFIRMED},
        ["department"],
    ),
    _fn("end_call", _msg("toolbox.tools.end_call"), {}, []),
]


class AgentToolbox:
    def __init__(
        self,
        business_id: str,
        caller_number: str,
        call_id: Optional[str],
        facts: BusinessFacts,
        db_factory: Callable[[], Session],
        gate: ActionGate,
        now_fn: Callable[[], datetime],
        dry_run: bool = False,
        require_confirmation: bool = True,
        disabled_tools: Optional[Set[str]] = None,
        transfer_phone: Optional[str] = None,
    ) -> None:
        self.transfer_phone = transfer_phone  # Escalation tab "Fallback Phone Number": where transfers ring
        self.require_confirmation = require_confirmation  # Behavior tab toggle; applies to bookings only
        self.disabled_tools: Set[str] = set(disabled_tools or ())  # Behavior tab capability switches
        self.business_id = business_id
        self.caller_number = caller_number
        self.call_id = call_id
        self.facts = facts
        self.db_factory = db_factory
        self.gate = gate
        self.now_fn = now_fn
        self.dry_run = dry_run
        self.last_utterance: str = ""  # the caller's latest words; set by the engine each turn (guards, not prompts)
        self.said: List[str] = []  # every caller utterance this call: what booking values are checked against
        self.last_assistant: str = ""  # our previous reply; a caller "yes" accepts what it proposed
        self.succeeded: Set[str] = set()  # actions a tool has really completed this call: "book" / "cancel" / "reschedule"
        self.ops = get_operations(getattr(facts, "vertical", None))  # the vertical's read/write operations (operations/registry.py)
        self.caller_number_ok = False  # the caller agreed to use the number they are calling from
        self.pending: Optional[Dict[str, Any]] = None  # {"type": "transfer"|"hangup", ...} consumed by the gateway
        self.calls: List[Dict[str, Any]] = []  # audit trail for evals and shadow logs

    def effective_said(self) -> List[str]:
        """What the caller has stated, plus the assistant's last proposal if the caller just agreed to it
        ("How about Thursday at ten?" -> "sure"). Without this a plain yes would loop back to the same question."""
        if self.said and is_affirmative(self.last_utterance) and self.last_assistant:
            return self.said + [self.last_assistant]
        return self.said

    # ------------------------------------------------------------------ dispatch
    async def execute(self, name: str, raw_args: Any) -> Dict[str, Any]:
        args = self._parse_args(raw_args)
        if name in self.disabled_tools:
            result = err("disabled", _msg("toolbox.execute.disabled"))
        elif args is None:
            result = err("bad_arguments", _msg("toolbox.execute.bad_arguments"))
        else:
            handler = getattr(self, f"_tool_{name}", None)
            if handler is None:
                result = err("unknown_tool", f"No tool named {name}.")
            else:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        result = await handler(args)
                    else:
                        result = await asyncio.to_thread(self._run_sync, handler, args)
                except Exception as e:  # tool failure must never crash the call
                    logger.error("agent tool %s failed: %s", name, e, exc_info=True)
                    result = err("tool_error", _msg("toolbox.execute.tool_error"))
        self.calls.append({"tool": name, "args": args, "result_code": result.get("code") or ("ok" if result.get("ok") else "error"), "ok": result.get("ok")})
        for kind, codes in SUCCESS_CODES.items():  # what may now be truthfully claimed to the caller, for the whole call
            if result.get("code") in codes and name.startswith(kind):  # book_appointment / cancel_appointment / ...
                self.succeeded.add(kind)
        if name == "lookup_appointment" and result.get("appointments"):
            self.succeeded.add("book")  # an existing appointment may be described as booked/confirmed
        return result

    @staticmethod
    def _parse_args(raw: Any) -> Optional[Dict[str, Any]]:
        if isinstance(raw, dict):
            return raw
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else None
        except (TypeError, ValueError):
            return None

    def _run_sync(self, handler: Callable, args: Dict[str, Any]) -> Dict[str, Any]:
        db = self.db_factory()
        try:
            return handler(args, db)
        finally:
            db.close()

    # ------------------------------------------------------------------ helpers
    def _booked(self, db: Session, d: date) -> List[Booked]:
        rows = self.ops.read.get_appointments(db, self.business_id, date=d.isoformat(), statuses=BLOCKING_STATUSES)
        return booked_from_appointments(rows)

    def _fk_call_id(self, db: Session) -> Optional[str]:
        if not self.call_id:
            return None
        from backend.server.database.models.call import Call

        return self.call_id if db.get(Call, self.call_id) else None

    # ------------------------------------------------------------------ tools
    def _tool_check_availability(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        now = self.now_fn()
        when = parse_date(args.get("date"), now.date())
        if not when:
            return err("bad_date", _msg("toolbox.check_availability.bad_date"))
        if not any(when in dates_in(s, now.date()) for s in self.effective_said()):
            return err("not_from_caller", _msg("toolbox.check_availability.not_from_caller_date"), field="date")
        doctor = match_doctor(args.get("doctor_name"), self.facts.doctors)
        if not no_doctor_preference(args.get("doctor_name")) and not doctor:
            return err("unknown_doctor", _msg("toolbox.check_availability.unknown_doctor", doctors=', '.join(self.facts.doctors) or 'none listed'))

        avail = day_ranges(self.facts.working_hours, when)
        label = speak_date(when, now.date())
        if not avail.configured:
            return {"ok": True, "configured": False, "date": label, "message": _msg("toolbox.check_availability.hours_not_configured")}
        if not avail.ranges:
            return {"ok": True, "date": label, "open": False, "message": _msg("toolbox.check_availability.closed", label=label)}

        booked = self._booked(db, when)
        floor = slot_floor(when, now, self.facts.notice_hours)
        slots = open_slots(avail, booked, doctor, len(self.facts.doctors), self.facts.slot_minutes, floor)
        result: Dict[str, Any] = {"ok": True, "date": label, "open": True, "doctor": doctor or "any", "open_slots_count": len(slots)}

        if args.get("time"):
            t = parse_time(args["time"])
            if not t:
                return err("bad_time", _msg("toolbox.check_availability.bad_time"))
            problem = validate_slot(when, t, doctor, self.facts, booked, now)
            result["requested_time"] = format_time(t)
            result["requested_time_free"] = problem is None
            if problem:
                result["reason"] = problem["code"]
                result["alternatives"] = problem.get("alternatives") or [format_time(s) for s in slots[:4]]
            return result
        # Offer a spread across the day rather than the first N early slots.
        step = max(1, len(slots) // 5)
        result["open_slots"] = [format_time(s) for s in slots[::step][:6]]
        return result

    def _tool_book_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        now = self.now_fn()
        fields, error = normalize_booking(args, self.facts, now)
        if error:
            return error
        # The calling number counts only after the caller agreed to it; the model must not assume it silently.
        error = ground_booking(fields, self.effective_said(), self.caller_number if self.caller_number_ok else "", now.date())
        if error:
            return error
        # Idempotency first: a repeated confirm (or an STT double-fire) must not create a duplicate row, and the
        # caller's own existing appointment must not make its slot look "taken".
        existing = self.ops.read.get_appointments(db, self.business_id, date=fields["date"].isoformat(), statuses=BLOCKING_STATUSES)
        for row in existing:
            if same_phone(row.get("phone_number"), fields["phone_number"]) and parse_time(row.get("preferred_time")) == fields["time"]:
                return {"ok": True, "code": "already_booked", "message": _msg("toolbox.book_appointment.already_booked"), "when": describe(fields, now.date())}

        # A patient who already has an upcoming appointment and wants a change must reschedule it, never get a second booking.
        upcoming = self.ops.read.get_appointments(db, self.business_id, statuses=BLOCKING_STATUSES)
        clash = existing_appointment_conflict(upcoming, fields["phone_number"], fields["service_name"], self.effective_said(), now.date())
        if clash:
            when_existing = _msg("toolbox.when", date=clash.get('preferred_date'), time=clash.get('preferred_time'))
            return err(
                "existing_appointment",
                _msg("toolbox.book_appointment.existing_appointment", service_name=clash.get('service_name'), when_existing=when_existing),
            )

        booked = booked_from_appointments(existing)
        problem = validate_slot(fields["date"], fields["time"], fields["doctor_name"] or None, self.facts, booked, now)
        if problem:
            return problem

        # With the owner's confirmation toggle off, a booking needs no read-back turn (grounding above still applies).
        gate_result = check_confirmation(self.gate, "book", fields, bool(args.get("confirmed_by_caller"))) if self.require_confirmation else None
        if gate_result:
            gate_result["when"] = describe(fields, now.date())
            return gate_result

        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": _msg("toolbox.book_appointment.dry_run"), "when": describe(fields, now.date())}
        row = self.ops.write.store_appointment(
            db=db,
            business_id=self.business_id,
            patient_name=fields["patient_name"],
            phone_number=fields["phone_number"],
            service_name=fields["service_name"] or "General Consultation",
            preferred_date=fields["date"].isoformat(),
            preferred_time=format_time(fields["time"]),
            doctor_name=fields["doctor_name"] or None,
            source="ai_whatsapp_chat" if getattr(self, "channel", "voice") == "chat" else "ai_voice_receptionist",  # chat gets no SMS: the reply itself confirms
            call_id=self._fk_call_id(db),
            status="confirmed",
        )
        self.gate.proposals.pop("book", None)
        return {"ok": True, "code": "booked", "message": _msg("toolbox.book_appointment.booked"), "appointment_id": row["id"], "when": describe(fields, now.date())}

    def _tool_lookup_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        asked = args.get("phone_number")
        if getattr(self, "channel", "voice") == "chat" and asked and not same_phone(asked, self.caller_number):
            return err("not_yours", _msg("toolbox.lookup_appointment.not_yours"))
        phone = normalize_phone(args.get("phone_number") or self.caller_number)
        if len(phone) < 10:
            return err("bad_phone", _msg("toolbox.lookup_appointment.bad_phone"))
        today = self.now_fn().date()
        rows = self.ops.read.get_appointments(db, self.business_id, status="confirmed")
        mine = []
        for row in rows:
            d = parse_date(row.get("preferred_date"), today)
            if same_phone(row.get("phone_number"), phone) and d and d >= today:
                mine.append((d, row))
        mine.sort(key=lambda x: (x[0], str(x[1].get("preferred_time"))))
        if not mine:
            return {"ok": True, "appointments": [], "message": _msg("toolbox.lookup_appointment.none_found")}
        out = []
        for i, (d, row) in enumerate(mine[:5], start=1):
            ref = f"A{i}"
            self.gate.refs[ref] = row["id"]
            self.gate.ref_phone[ref] = phone
            out.append({"ref": ref, "date": speak_date(d, today), "time": row.get("preferred_time"), "doctor": row.get("doctor_name"), "service": row.get("service_name")})
        return {"ok": True, "appointments": out}

    def _owned_appointment(self, ref: Optional[str], db: Session):
        appt_id = self.gate.refs.get(str(ref or ""))
        if not appt_id:
            return None, err("lookup_first", _msg("toolbox.owned_appointment.lookup_first"))
        row = self.ops.read.get_appointment_by_id(db, self.business_id, appt_id)
        if not row or not same_phone(row.get("phone_number"), self.gate.ref_phone.get(str(ref))):
            return None, err("not_found", _msg("toolbox.owned_appointment.not_found"))
        return row, None

    def _tool_cancel_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        row, error = self._owned_appointment(args.get("ref"), db)
        if error:
            return error
        today = self.now_fn().date()
        d = parse_date(row.get("preferred_date"), today)
        fields = {"ref": args["ref"], "id": row["id"]}
        gate_result = check_confirmation(self.gate, f"cancel:{args['ref']}", fields, bool(args.get("confirmed_by_caller")))
        if gate_result:
            gate_result["when"] = _msg("toolbox.when", date=speak_date(d, today) if d else row.get('preferred_date'), time=row.get('preferred_time'))
            return gate_result
        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": _msg("toolbox.cancel_appointment.dry_run")}
        self.ops.write.cancel_appointment(db, self.business_id, row["id"])
        self.gate.refs.pop(str(args["ref"]), None)
        return {"ok": True, "code": "cancelled", "message": _msg("toolbox.cancel_appointment.cancelled")}

    def _tool_reschedule_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        row, error = self._owned_appointment(args.get("ref"), db)
        if error:
            return error
        now = self.now_fn()
        when = parse_date(args.get("new_date"), now.date())
        start = parse_time(args.get("new_time"))
        if not when:
            return err("bad_date", _msg("toolbox.reschedule_appointment.bad_date"))
        if not start:
            return err("bad_time", _msg("toolbox.reschedule_appointment.bad_time"))
        said = self.effective_said()
        if not any(when in dates_in(s, now.date()) for s in said):
            return err("not_from_caller", _msg("toolbox.reschedule_appointment.not_from_caller_date"), field="new_date")
        if not any(parse_time(s) == start or (start.hour, start.minute) in times_in(s) for s in said):
            return err("not_from_caller", _msg("toolbox.reschedule_appointment.not_from_caller_time"), field="new_time")
        doctor = match_doctor(row.get("doctor_name"), self.facts.doctors)
        problem = validate_slot(when, start, doctor, self.facts, self._booked(db, when), now, ignore_id=row["id"])
        if problem:
            return problem
        fields = {"ref": args["ref"], "date": when, "time": start}
        gate_result = check_confirmation(self.gate, f"reschedule:{args['ref']}", fields, bool(args.get("confirmed_by_caller")))
        if gate_result:
            gate_result["when"] = _msg("toolbox.when", date=speak_date(when, now.date()), time=format_time(start))
            return gate_result
        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": _msg("toolbox.reschedule_appointment.dry_run")}
        self.ops.write.reschedule_appointment(db, self.business_id, row["id"], when.isoformat(), format_time(start))
        return {"ok": True, "code": "rescheduled", "message": _msg("toolbox.reschedule_appointment.rescheduled"), "when": _msg("toolbox.when", date=speak_date(when, now.date()), time=format_time(start))}

    def _tool_search_knowledge(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        query = str(args.get("query") or "").strip()
        if not query:
            return err("bad_arguments", "Provide a search query.")
        try:
            from backend.ai.engine.rag.retriever import rag_retriever
            from backend.server.api.routes.knowledge import ensure_business_indexed

            ensure_business_indexed(self.business_id, db, force_reload=False)
            snippets = rag_retriever.retrieve_snippets(self.business_id, query, top_k=3)
        except Exception as e:
            logger.warning("search_knowledge failed: %s", e)
            snippets = []
        if not snippets:
            return {"ok": True, "snippets": [], "message": _msg("toolbox.search_knowledge.not_found")}
        return {"ok": True, "snippets": snippets}

    async def _tool_transfer_to_human(self, args: Dict[str, Any]) -> Dict[str, Any]:
        department = str(args.get("department") or "front_desk").strip().lower().replace(" ", "_")
        reason = str(args.get("reason") or "Caller requested a human")
        # Emergencies always go through. Anything else needs the caller's explicit request, or a yes to
        # "shall I connect you?", so identity questions and small confusions never end a call by accident.
        if department != "emergency" and not explicit_human_request(self.last_utterance):
            gate_result = check_confirmation(
                self.gate,
                "transfer",
                {"department": department},
                bool(args.get("confirmed_by_caller")),
                prompt=_msg("toolbox.transfer_to_human.not_requested"),
            )
            if gate_result:
                return gate_result
        if self.dry_run:  # counted as a transfer for scoring/logging, but no call is placed
            self.pending = {"type": "transfer", "department": department, "twiml": None, "dry_run": True}
            return {"ok": True, "code": "dry_run", "message": _msg("toolbox.transfer_to_human.dry_run")}
        return await self.transfer(department, reason)

    async def transfer(self, department: str, reason: str) -> Dict[str, Any]:
        """Also used directly by the safety gate, which transfers without asking the LLM."""
        from backend.ai.tools.framework.registry import tool_registry
        import backend.ai.tools  # noqa: F401  (registers the default tools)

        def _run() -> Any:
            db = self.db_factory()
            try:
                ctx = ToolContext(
                    business_id=self.business_id, caller_number=self.caller_number, call_id=self.call_id, db=db,
                    metadata={"transfer_phone": self.transfer_phone} if self.transfer_phone else {},
                )
                return asyncio.run(tool_registry.execute("transfer_call", ctx, department=department, reason=reason))

            finally:
                db.close()

        res = await asyncio.to_thread(_run)
        if not res.success:
            return err("transfer_unavailable", _msg("toolbox.transfer.transfer_unavailable"))
        self.pending = {"type": "transfer", "department": department, "twiml": res.data.get("twiml"), "data": res.data}
        return {"ok": True, "code": "transferring", "message": _msg("toolbox.transfer.started")}

    async def _tool_end_call(self, args: Dict[str, Any]) -> Dict[str, Any]:
        self.pending = {"type": "hangup"}
        return {"ok": True, "code": "ending", "message": "Say a brief goodbye."}
