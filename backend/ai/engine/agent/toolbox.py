"""Agent toolbox: the only way the LLM can touch data. Every tool
  - gets business_id / caller_number / call_id from the runtime, never from LLM arguments,
  - returns a small JSON dict the LLM can explain naturally,
  - writes only after the ActionGate says the caller confirmed.
`dry_run=True` (shadow mode) validates everything but persists nothing and never transfers."""

import asyncio
import copy
import json
import logging
import re
from functools import lru_cache
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from backend.ai.capabilities.operations.clinic.booking_guard import existing_appointment_conflict
from backend.ai.capabilities.operations.clinic.slot_availability import BLOCKING_STATUSES
from backend.ai.capabilities.operations.registry import get_operations
from backend.ai.engine.agent.availability import Booked, booked_from_appointments, day_ranges, open_slots
from backend.ai.engine.agent.datetime_utils import dates_in, format_time, parse_date, parse_time, speak_date
from backend.ai.engine.agent.grounding import SUCCESS_CODES, times_in
from backend.ai.engine.agent.hindi import offered_to_connect
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


def _msg_for(vertical: Optional[str], key: str, **fmt) -> str:
    """Model-facing message from ai/prompts/engine_notes.json ("messages"), with the vertical's overlay (healthcare: none);
    `fmt` fills the {placeholders}."""
    group, name = key.split(".", 1)
    text = load_prompts("engine_notes", vertical)["messages"][group][name]
    return text.format(**fmt) if fmt else text.replace("{{", "{").replace("}}", "}")


def _msg(key: str, **fmt) -> str:
    return _msg_for(None, key, **fmt)

logger = logging.getLogger(__name__)

_TIME = {"type": "string", "description": "with AM/PM, e.g. 5:30 PM"}


def _fn(name: str, description: str, properties: Dict[str, Any], required: List[str]) -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties, "required": required},
        },
    }


@lru_cache(maxsize=None)
def _tool_schemas(vertical: Optional[str]) -> Tuple[Dict[str, Any], ...]:
    """Every tool the toolbox implements, described in the vertical's words (healthcare: the base wording). Which of them a
    business's model is offered is decided by its workflows (backend/ai/workflows) and the owner's switches."""
    def m(key: str, **fmt) -> str:
        return _msg_for(vertical, key, **fmt)

    _DATE = {"type": "string", "description": m("toolbox.tools.param.date_example")}
    _CONFIRMED = {"type": "boolean", "description": m("toolbox.tools.param.confirmed_by_caller")}
    return (
        _fn(
            "check_availability",
            m("toolbox.tools.check_availability"),
            {"date": _DATE, "doctor_name": {"type": "string"}, "time": {"type": "string", "description": "test one time"}},
            ["date"],
        ),
        _fn(
            "book_appointment",
            m("toolbox.tools.book_appointment"),
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
            m("toolbox.tools.lookup_appointment"),
            {"phone_number": {"type": "string"}},
            ["phone_number"],
        ),
        _fn(
            "cancel_appointment",
            m("toolbox.tools.cancel_appointment"),
            {"ref": {"type": "string"}, "confirmed_by_caller": _CONFIRMED},
            ["ref", "confirmed_by_caller"],
        ),
        _fn(
            "reschedule_appointment",
            m("toolbox.tools.reschedule_appointment"),
            {"ref": {"type": "string"}, "new_date": _DATE, "new_time": _TIME, "confirmed_by_caller": _CONFIRMED},
            ["ref", "new_date", "new_time", "confirmed_by_caller"],
        ),
        _fn(
            "send_confirmation",
            m("toolbox.tools.send_confirmation"),
            {"phone_number": {"type": "string", "description": "only if the caller gave another number"}, "channel": {"type": "string", "enum": ["whatsapp", "sms"]}},
            [],
        ),
        _fn("search_knowledge", m("toolbox.tools.search_knowledge"), {"query": {"type": "string"}}, ["query"]),
        _fn(
            "transfer_to_human",
            m("toolbox.tools.transfer_to_human"),
            {"department": {"type": "string"}, "reason": {"type": "string"}, "confirmed_by_caller": _CONFIRMED},
            ["department"],
        ),
        _fn("end_call", m("toolbox.tools.end_call"), {}, []),
        _fn(
            "capture_enquiry",
            m("toolbox.tools.capture_enquiry"),
            {
                "name": {"type": "string"},
                "phone_number": {"type": "string"},
                "kind": {"type": "string", "enum": ["enquiry", "admission", "callback", "demo_request", "support"]},
                "topic": {"type": "string"},
                "subject": {"type": "string", "description": m("toolbox.tools.param.enquiry_subject")},
                "applicant_type": {"type": "string", "enum": ["domestic", "international"]},
                "study_level": {"type": "string", "enum": ["undergraduate", "postgraduate", "doctoral"]},
                "grade": {"type": "string"},
                "batch_preference": {"type": "string"},
                "country": {"type": "string"},
                "academic_year": {"type": "string"},
                "email": {"type": "string"},
                "department": {"type": "string"},
                "notes": {"type": "string", "description": m("toolbox.tools.param.enquiry_notes")},
                "confirmed_by_caller": _CONFIRMED,
            },
            ["name", "phone_number", "confirmed_by_caller"],
        ),
    )


def tool_schemas(vertical: Optional[str] = None) -> List[Dict[str, Any]]:
    return [copy.deepcopy(s) for s in _tool_schemas(str(vertical or "").strip().lower() or None)]


TOOL_SCHEMAS: List[Dict[str, Any]] = tool_schemas()  # the base (healthcare) wording

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
        sandbox: Optional[Any] = None,
        allowed_tools: Optional[Set[str]] = None,
    ) -> None:
        # The business's workflows decide which tools exist for it at all (backend/ai/workflows); None = every tool (healthcare
        # resolves to all of today's tools). A tool outside the list is refused in code, whatever the model asks for.
        self.allowed_tools: Optional[Set[str]] = set(allowed_tools) if allowed_tools is not None else None
        self.route_context: Optional[Callable[[], Dict[str, Any]]] = None  # the workflow's validated slots, for department routing
        self.sandbox = sandbox  # SandboxLedger: playground test mode, nothing the agent does is saved or sent
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
        if sandbox is not None:
            from backend.ai.engine.agent.sandbox import SandboxOperations

            self.ops = SandboxOperations(self.ops, sandbox)  # same interface; writes land in the ledger, reads see the clinic's real data
        self.caller_number_ok = False  # the caller agreed to use the number they are calling from
        self.confirmations_sent = 0  # appointment details texted on this call (capped)
        self.language = "en"  # the caller's language, set by the engine each turn, so the message goes out in it
        self.pending: Optional[Dict[str, Any]] = None  # {"type": "transfer"|"hangup", ...} consumed by the gateway
        self.calls: List[Dict[str, Any]] = []  # audit trail for evals and shadow logs

    def effective_said(self) -> List[str]:
        """What the caller has stated, plus the assistant's last proposal if the caller just agreed to it
        ("How about Thursday at ten?" -> "sure"). Without this a plain yes would loop back to the same question."""
        if self.said and is_affirmative(self.last_utterance) and self.last_assistant:
            return self.said + [self.last_assistant]
        return self.said

    def _m(self, key: str, **fmt) -> str:
        """A model-facing message in this business's vertical wording (healthcare: the base wording)."""
        return _msg_for(getattr(self.facts, "vertical", None), key, **fmt)

    # ------------------------------------------------------------------ dispatch
    async def execute(self, name: str, raw_args: Any) -> Dict[str, Any]:
        args = self._parse_args(raw_args)
        if self.allowed_tools is not None and name not in self.allowed_tools:
            result = err("not_allowed", self._m("toolbox.execute.not_allowed"))
        elif name in self.disabled_tools:
            result = err("disabled", self._m("toolbox.execute.disabled"))
        elif args is None:
            result = err("bad_arguments", self._m("toolbox.execute.bad_arguments"))
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
                    result = err("tool_error", self._m("toolbox.execute.tool_error"))
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
            return err("bad_date", self._m("toolbox.check_availability.bad_date"))
        if not any(when in dates_in(s, now.date()) for s in self.effective_said()):
            return err("not_from_caller", self._m("toolbox.check_availability.not_from_caller_date"), field="date")
        doctor = match_doctor(args.get("doctor_name"), self.facts.doctors)
        if not no_doctor_preference(args.get("doctor_name")) and not doctor:
            return err("unknown_doctor", self._m("toolbox.check_availability.unknown_doctor", doctors=', '.join(self.facts.doctors) or 'none listed'))

        avail = day_ranges(self.facts.working_hours, when)
        label = speak_date(when, now.date())
        if not avail.configured:
            return {"ok": True, "configured": False, "date": label, "message": self._m("toolbox.check_availability.hours_not_configured")}
        if not avail.ranges:
            return {"ok": True, "date": label, "open": False, "message": self._m("toolbox.check_availability.closed", label=label)}

        booked = self._booked(db, when)
        floor = slot_floor(when, now, self.facts.notice_hours)
        slots = open_slots(avail, booked, doctor, len(self.facts.doctors), self.facts.slot_minutes, floor)
        result: Dict[str, Any] = {"ok": True, "date": label, "open": True, "doctor": doctor or "any", "open_slots_count": len(slots)}

        if args.get("time"):
            t = parse_time(args["time"])
            if not t:
                return err("bad_time", self._m("toolbox.check_availability.bad_time"))
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
                return {"ok": True, "code": "already_booked", "message": self._m("toolbox.book_appointment.already_booked"), "when": describe(fields, now.date())}

        # A patient who already has an upcoming appointment and wants a change must reschedule it, never get a second booking.
        upcoming = self.ops.read.get_appointments(db, self.business_id, statuses=BLOCKING_STATUSES)
        clash = existing_appointment_conflict(upcoming, fields["phone_number"], fields["service_name"], self.effective_said(), now.date())
        if clash:
            when_existing = self._m("toolbox.when", date=clash.get('preferred_date'), time=clash.get('preferred_time'))
            return err(
                "existing_appointment",
                self._m("toolbox.book_appointment.existing_appointment", service_name=clash.get('service_name'), when_existing=when_existing),
            )

        booked = booked_from_appointments(existing)
        problem = validate_slot(fields["date"], fields["time"], fields["doctor_name"] or None, self.facts, booked, now)
        if problem:
            return problem
        # Verticals whose sessions hold a room too (wellness): refuse before the read-back, never after a "yes".
        resource_problem = getattr(self.ops.write, "resource_problem", None)
        if resource_problem and resource_problem(db, self.business_id, fields["service_name"], fields["date"].isoformat(), format_time(fields["time"])):
            return err("no_room", self._m("toolbox.book_appointment.no_room"))

        # With the owner's confirmation toggle off, a booking needs no read-back turn (grounding above still applies).
        gate_result = check_confirmation(self.gate, "book", fields, bool(args.get("confirmed_by_caller"))) if self.require_confirmation else None
        if gate_result:
            gate_result["when"] = describe(fields, now.date())
            return gate_result

        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.book_appointment.dry_run"), "when": describe(fields, now.date())}
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
        return {"ok": True, "code": "booked", "message": self._m("toolbox.book_appointment.booked"), "appointment_id": row["id"], "when": describe(fields, now.date())}

    def _tool_lookup_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        asked = args.get("phone_number")
        if getattr(self, "channel", "voice") == "chat" and asked and not same_phone(asked, self.caller_number):
            return err("not_yours", self._m("toolbox.lookup_appointment.not_yours"))
        phone = normalize_phone(args.get("phone_number") or self.caller_number)
        if len(phone) < 10:
            return err("bad_phone", self._m("toolbox.lookup_appointment.bad_phone"))
        today = self.now_fn().date()
        rows = self.ops.read.get_appointments(db, self.business_id, status="confirmed")
        mine = []
        for row in rows:
            d = parse_date(row.get("preferred_date"), today)
            if same_phone(row.get("phone_number"), phone) and d and d >= today:
                mine.append((d, row))
        mine.sort(key=lambda x: (x[0], str(x[1].get("preferred_time"))))
        if not mine:
            return {"ok": True, "appointments": [], "message": self._m("toolbox.lookup_appointment.none_found")}
        out = []
        for i, (d, row) in enumerate(mine[:5], start=1):
            ref = f"A{i}"
            self.gate.refs[ref] = row["id"]
            self.gate.ref_phone[ref] = phone
            out.append({"ref": ref, "date": speak_date(d, today), "time": row.get("preferred_time"), "doctor": row.get("doctor_name"), "service": row.get("service_name")})
        return {"ok": True, "appointments": out}

    def _tool_send_confirmation(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Send the caller's next upcoming appointment to their phone with the clinic's own booking.confirmed template. Only
        appointments booked under that phone number can be sent to it, and at most twice per call."""
        phone = normalize_phone(args.get("phone_number") or self.caller_number)
        if len(phone) < 10:
            return err("bad_phone", self._m("toolbox.lookup_appointment.bad_phone"))
        if self.confirmations_sent >= 2:
            return err("limit", self._m("toolbox.send_confirmation.limit"))
        today = self.now_fn().date()
        mine = []
        for row in self.ops.read.get_appointments(db, self.business_id, status="confirmed"):
            d = parse_date(row.get("preferred_date"), today)
            if same_phone(row.get("phone_number"), phone) and d and d >= today:
                mine.append((d, str(row.get("preferred_time")), row))
        if not mine:
            return err("no_appointment", self._m("toolbox.send_confirmation.no_appointment"))
        d, _, row = min(mine, key=lambda x: (x[0], x[1]))
        channel = args.get("channel") if args.get("channel") in ("whatsapp", "sms") else None
        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.send_confirmation.dry_run", channel=channel or "WhatsApp or SMS")}
        from backend.server.database.models.business import Business
        from backend.server.notifications.messenger import context_for, send_event_sync

        biz = db.get(Business, self.business_id)
        res = send_event_sync(
            db, "booking.confirmed", business_id=self.business_id, phone=phone, language=self.language or "en", only_channels=[channel] if channel else None,
            context=context_for("booking.confirmed", patient_name=row.get("customer_name") or row.get("patient_name"), service=row.get("service_name"), doctor=row.get("doctor_name"),
                                date=speak_date(d, today), time=row.get("preferred_time"), clinic_name=biz.name if biz else "the clinic", clinic_phone=biz.business_phone if biz else None),
        )
        self.confirmations_sent += 1
        done = next((a["channel"] for a in res.get("attempts", []) if a.get("sent")), None)
        if res.get("sent") and done:
            return {"ok": True, "code": "sent", "channel": done, "message": self._m("toolbox.send_confirmation.sent", channel="WhatsApp" if done == "whatsapp" else "SMS")}
        reason = next((a.get("reason") for a in res.get("attempts", []) if a.get("reason")), None) or res.get("reason") or "no channel is available"
        return err("not_sent", self._m("toolbox.send_confirmation.not_sent", reason=reason))

    def _owned_appointment(self, ref: Optional[str], db: Session):
        appt_id = self.gate.refs.get(str(ref or ""))
        if not appt_id:
            return None, err("lookup_first", self._m("toolbox.owned_appointment.lookup_first"))
        row = self.ops.read.get_appointment_by_id(db, self.business_id, appt_id)
        if not row or not same_phone(row.get("phone_number"), self.gate.ref_phone.get(str(ref))):
            return None, err("not_found", self._m("toolbox.owned_appointment.not_found"))
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
            gate_result["when"] = self._m("toolbox.when", date=speak_date(d, today) if d else row.get('preferred_date'), time=row.get('preferred_time'))
            return gate_result
        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.cancel_appointment.dry_run")}
        self.ops.write.cancel_appointment(db, self.business_id, row["id"])
        self.gate.refs.pop(str(args["ref"]), None)
        return {"ok": True, "code": "cancelled", "message": self._m("toolbox.cancel_appointment.cancelled")}

    def _tool_reschedule_appointment(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        row, error = self._owned_appointment(args.get("ref"), db)
        if error:
            return error
        now = self.now_fn()
        when = parse_date(args.get("new_date"), now.date())
        start = parse_time(args.get("new_time"))
        if not when:
            return err("bad_date", self._m("toolbox.reschedule_appointment.bad_date"))
        if not start:
            return err("bad_time", self._m("toolbox.reschedule_appointment.bad_time"))
        said = self.effective_said()
        if not any(when in dates_in(s, now.date()) for s in said):
            return err("not_from_caller", self._m("toolbox.reschedule_appointment.not_from_caller_date"), field="new_date")
        if not any(parse_time(s) == start or (start.hour, start.minute) in times_in(s) for s in said):
            return err("not_from_caller", self._m("toolbox.reschedule_appointment.not_from_caller_time"), field="new_time")
        doctor = match_doctor(row.get("doctor_name"), self.facts.doctors)
        problem = validate_slot(when, start, doctor, self.facts, self._booked(db, when), now, ignore_id=row["id"])
        if problem:
            return problem
        resource_problem = getattr(self.ops.write, "resource_problem", None)  # wellness: the moved session needs a free room too
        if resource_problem and resource_problem(db, self.business_id, row.get("service_name") or "", when.isoformat(), format_time(start),
                                                 ignore_booking=row["id"]):
            return err("no_room", self._m("toolbox.book_appointment.no_room"))
        fields = {"ref": args["ref"], "date": when, "time": start}
        gate_result = check_confirmation(self.gate, f"reschedule:{args['ref']}", fields, bool(args.get("confirmed_by_caller")))
        if gate_result:
            gate_result["when"] = self._m("toolbox.when", date=speak_date(when, now.date()), time=format_time(start))
            return gate_result
        if self.dry_run:
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.reschedule_appointment.dry_run")}
        self.ops.write.reschedule_appointment(db, self.business_id, row["id"], when.isoformat(), format_time(start))
        return {"ok": True, "code": "rescheduled", "message": self._m("toolbox.reschedule_appointment.rescheduled"), "when": self._m("toolbox.when", date=speak_date(when, now.date()), time=format_time(start))}

    def _tool_search_knowledge(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """The shared knowledge base (backend/ai/engine/rag), scoped to this business: ranked passages with sources, and an
        exact table lookup for fees and prices. Ambiguous or unlisted table questions come back as "ask" / "not listed"."""
        query = str(args.get("query") or "").strip()
        if not query:
            return err("bad_arguments", "Provide a search query.")
        try:
            from backend.ai.engine.rag import index
            from backend.ai.engine.rag.answering import for_agent

            context = dict(self.route_context() or {}) if self.route_context else {}
            hints = [str(context[k]) for k in ("programme", "applicant_type", "study_level", "country", "academic_year") if context.get(k)]
            shaped = for_agent(index.search(db, self.business_id, query, top_k=4, hints=hints))
        except Exception as e:
            logger.warning("search_knowledge failed: %s", e)
            shaped = {"ok": True, "snippets": []}
        table = shaped.get("table")
        if table and table["status"] == "ambiguous" and table.get("ask_for"):
            shaped["message"] = self._m("toolbox.search_knowledge.ambiguous", ask_for=", ".join(table["ask_for"]),
                                        options="; ".join(f"{k}: {', '.join(v)}" for k, v in table["options"].items()))
            return shaped
        if table and table["status"] == "no_match" and not shaped["snippets"]:
            shaped["message"] = self._m("toolbox.search_knowledge.no_match",
                                        matched=", ".join(f"{k} {'/'.join(v)}" for k, v in table["matched"].items()))
            return shaped
        if not shaped["snippets"] and not (table and table["status"] == "exact"):
            return {"ok": True, "snippets": [], "message": self._m("toolbox.search_knowledge.not_found")}
        message = self._m("toolbox.search_knowledge.found")
        if table and table["status"] == "exact":
            message = self._m("toolbox.search_knowledge.exact", source=table["source"], summary=table["summary"]) + " " + message
        shaped["message"] = message
        return shaped

    async def _tool_transfer_to_human(self, args: Dict[str, Any]) -> Dict[str, Any]:
        department = str(args.get("department") or "front_desk").strip().lower().replace(" ", "_")
        reason = str(args.get("reason") or "Caller requested a human")
        # Emergencies always go through. Anything else needs the caller's explicit request, or a yes to
        # "shall I connect you?", so identity questions and small confusions never end a call by accident.
        # A yes to our own "shall I connect you?" is the confirmation: transfer this turn, without a second "are you sure?".
        agreed = is_affirmative(self.last_utterance) and offered_to_connect(self.last_assistant)
        if department != "emergency" and not explicit_human_request(self.last_utterance) and not agreed:
            gate_result = check_confirmation(
                self.gate,
                "transfer",
                {"department": department},
                bool(args.get("confirmed_by_caller")),
                prompt=self._m("toolbox.transfer_to_human.not_requested"),
            )
            if gate_result:
                return gate_result
        if self.dry_run or self.sandbox is not None:  # counted as a transfer for scoring/logging, but no call is placed
            if self.sandbox is not None:
                self.sandbox.record("transfer", f"Would transfer the call to {department}", department=department)
            self.pending = {"type": "transfer", "department": department, "twiml": None, "dry_run": True}
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.transfer_to_human.dry_run")}
        return await self.transfer(department, reason)

    async def transfer(self, department: str, reason: str) -> Dict[str, Any]:
        """Also used directly by the safety gate, which transfers without asking the LLM."""
        from backend.ai.tools.framework.registry import tool_registry
        import backend.ai.tools  # noqa: F401  (registers the default tools)

        def _run() -> Any:
            db = self.db_factory()
            try:
                routed = self._route(db, department, reason)
                if isinstance(routed, dict) and not routed.get("transfer_phone"):
                    return routed  # a result for the model: nobody to dial
                metadata = routed or ({"transfer_phone": self.transfer_phone} if self.transfer_phone else {})
                ctx = ToolContext(
                    business_id=self.business_id, caller_number=self.caller_number, call_id=self.call_id, db=db,
                    metadata=metadata,
                )
                return asyncio.run(tool_registry.execute("transfer_call", ctx, department=metadata.get("department") or department, reason=reason))

            finally:
                db.close()

        res = await asyncio.to_thread(_run)
        if isinstance(res, dict):  # department directory: nobody can take the call now (closed / no destination / unknown)
            return res
        if not res.success:
            return err("transfer_unavailable", self._m("toolbox.transfer.transfer_unavailable"))
        self.pending = {"type": "transfer", "department": res.data.get("department") or department, "twiml": res.data.get("twiml"), "data": res.data}
        # "transferring" means the dial is being placed; whether anyone answered is recorded by the provider callback
        # (transfer_attempts), never claimed here.
        return {"ok": True, "code": "transferring", "message": self._m("toolbox.transfer.started")}

    def _route(self, db: Session, department: str, reason: str) -> Any:
        """A business with a department directory: the department to dial (metadata for transfer_call), or the model-facing
        result when nobody can take the call. Without a directory: None (the existing fallback-number path, unchanged)."""
        from backend.server.services import department_routing as routing

        if not routing.has_directory(db, self.business_id):
            return None
        context = dict(self.route_context() or {}) if self.route_context else {}
        decision = routing.choose(db, self.business_id, department, context)
        if decision.department is None:
            if department == "emergency":  # an emergency is never stopped by routing: the existing emergency path runs
                return None
            routing.record_unreachable(db, self.business_id, self.call_id, decision, reason)
            key = "toolbox.transfer.unreachable_callback" if (self.allowed_tools is None or "capture_enquiry" in self.allowed_tools) else "toolbox.transfer.unreachable_message"
            code = "department_closed" if decision.code == "department_closed" else ("unknown_department" if decision.code == "unknown_department" else "transfer_unavailable")
            return err(code, self._m(key))
        dept = decision.department
        attempt = routing.start_attempt(db, self.business_id, self.call_id, dept, decision.requested, reason)
        return {"transfer_phone": dept.transfer_phone, "staff_name": dept.name, "department": dept.key,
                "timeout": dept.timeout_seconds, "attempt_id": attempt.id}

    def _tool_capture_enquiry(self, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Save a lead / callback / demo request (education and every vertical that lists the tool). Same guarantees as a booking:
        the name and number must come from the caller (or their yes to the calling number), the details are read back and
        confirmed on a later turn, and a repeat never makes a second row."""
        import hashlib

        from backend.server.database.models.vertical import Enquiry

        name = str(args.get("name") or "").strip()
        phone = str(args.get("phone_number") or "").strip()
        if not name or not phone:
            return err("missing_fields", self._m("toolbox.capture_enquiry.missing_fields"))
        said = " ".join(self.effective_said()).lower()
        said_digits = re.sub(r"\D", "", said)
        digits = normalize_phone(phone)
        from_caller = len(digits) >= 7 and digits[-10:] in said_digits
        calling = self.caller_number_ok and (same_phone(phone, self.caller_number) or phone.lower() in ("calling number", "this number"))
        if calling:
            digits = normalize_phone(self.caller_number)
        if len(digits) < 7 or not (from_caller or calling):
            return err("bad_phone", self._m("toolbox.capture_enquiry.bad_phone"))
        if not any(part.lower() in said for part in re.findall(r"[\w'-]{2,}", name)):
            return err("not_from_caller", self._m("toolbox.capture_enquiry.not_from_caller"))
        kind = str(args.get("kind") or "enquiry").strip().lower()
        if kind not in ("enquiry", "admission", "callback", "demo_request", "support"):
            kind = "enquiry"
        subject = str(args.get("subject") or "").strip()[:255] or None
        fields = {"name": name, "phone_number": digits, "kind": kind, "subject": subject or ""}
        gate_result = check_confirmation(self.gate, "enquiry", fields, bool(args.get("confirmed_by_caller")),
                                         prompt=self._m("toolbox.capture_enquiry.read_back"))
        if gate_result:
            return gate_result
        if self.dry_run or self.sandbox is not None:
            if self.sandbox is not None:
                self.sandbox.record("enquiry", f"Would save a {kind} for {name}", kind=kind, subject=subject)
            return {"ok": True, "code": "dry_run", "message": self._m("toolbox.capture_enquiry.saved")}

        phone_key = digits[-10:]
        subject_key = (subject or "").lower()
        idem = hashlib.sha256(f"{self.call_id or self.caller_number}|{kind}|{phone_key}|{subject_key}".encode()).hexdigest()[:40]
        now = datetime.utcnow()
        recent = (
            db.query(Enquiry)
            .filter(Enquiry.business_id == self.business_id, Enquiry.contact_phone_key == phone_key, Enquiry.kind == kind,
                    Enquiry.status != "closed")
            .order_by(Enquiry.created_at.desc())
            .first()
        )
        if recent is not None and (recent.idempotency_key == idem or (recent.subject or "").lower() == subject_key):
            return {"ok": True, "code": "duplicate", "ref": recent.id[:8], "message": self._m("toolbox.capture_enquiry.duplicate")}
        details = {k: str(args[k]).strip()[:120] for k in ("applicant_type", "study_level", "grade", "batch_preference", "country", "academic_year") if args.get(k)}
        context = dict(self.route_context() or {}) if self.route_context else {}
        for k in ("applicant_type", "study_level", "country", "academic_year"):  # what the caller already said, if the model left it out
            if k not in details and context.get(k):
                details[k] = str(context[k]).strip()[:120]
        email = str(args.get("email") or "").strip()[:255] or None
        row = Enquiry(
            business_id=self.business_id, call_id=self.call_id, source="ai", kind=kind,
            topic=str(args.get("topic") or "").strip()[:50] or None, subject=subject,
            contact_name=name[:255], contact_phone=("+" + digits) if len(digits) > 10 else digits, contact_phone_key=phone_key,
            contact_email=email, details=details, department_key=str(args.get("department") or "").strip()[:50] or None,
            notes=str(args.get("notes") or "").strip()[:1000] or None, idempotency_key=idem,
            follow_up_due_at=now + timedelta(days=1) if kind in ("callback", "support") else None,
        )
        db.add(row)
        try:
            db.commit()
        except Exception:  # a concurrent save of the same enquiry hit the unique key: it is already there
            db.rollback()
            return {"ok": True, "code": "duplicate", "message": self._m("toolbox.capture_enquiry.duplicate")}
        try:
            from backend.server.services.audit import audit

            audit(db, "enquiry.captured", None, actor_email="ai-agent", business_id=self.business_id, target_type="enquiry",
                  target_id=row.id, meta={"kind": kind, "call_id": self.call_id})
        except Exception as e:  # the lead is saved; a missing audit line must not lose it
            logger.warning("enquiry audit failed: %s", e)
        self.succeeded.add("enquiry")
        return {"ok": True, "code": "saved", "ref": row.id[:8], "message": self._m("toolbox.capture_enquiry.saved")}

    async def _tool_end_call(self, args: Dict[str, Any]) -> Dict[str, Any]:
        self.pending = {"type": "hangup"}
        return {"ok": True, "code": "ending", "message": "Say a brief goodbye."}
