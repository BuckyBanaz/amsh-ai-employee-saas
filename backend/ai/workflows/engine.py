"""Workflow runtime: moves one workflow run through its steps from what trusted code observed, and persists it.

The LLM talks; this module only TRACKS and CHECKS. It never calls a tool and never decides an action on the model's say-so:
  - slot values come from tool arguments and the controller (code-parsed caller words), and are validated against the slot spec
    (enum values, regex, type) before they count;
  - a step that needs a tool advances only on that tool's real result code (from the toolbox, not from the model's text);
  - every step entry is counted, and a step entered more than its `max_visits` ends the run as failed ("loop_exceeded"), so no
    workflow can loop forever;
  - the run (state, slots, visits, history) is saved after every change, keyed by (business, conversation, workflow), so a new
    turn, a reconnect or a second worker resumes it instead of starting over.
"""

import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from backend.ai.workflows.schema import Condition, SlotSpec, StepSpec, WorkflowSpec

logger = logging.getLogger(__name__)

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass
class RunState:
    workflow_id: str
    workflow_version: str
    state: str
    status: str = "active"  # active | completed | failed
    outcome: Optional[str] = None
    slots: Dict[str, Any] = field(default_factory=dict)
    visits: Dict[str, int] = field(default_factory=dict)
    history: List[Dict[str, str]] = field(default_factory=list)
    rejected: Dict[str, str] = field(default_factory=dict)  # slot -> why the last value was refused (not persisted)

    def to_row(self) -> Dict[str, Any]:
        data = asdict(self)
        data.pop("rejected", None)
        return data


def slot_problem(spec: SlotSpec, value: Any) -> Optional[str]:
    """Why `value` is not acceptable for this slot, or None. Code-side validation: the model's word is never enough."""
    text = str(value or "").strip()
    if not text:
        return "empty"
    if spec.type == "enum" and spec.allowed_values and text.lower() not in {v.lower() for v in spec.allowed_values}:
        return f"must be one of {', '.join(spec.allowed_values)}"
    if spec.type == "phone" and len(re.sub(r"\D", "", text)) < 7 and text != "calling number":
        return "not a full phone number"
    if spec.type == "email" and not _EMAIL.match(text):
        return "not an email address"
    if spec.validation and not re.fullmatch(spec.validation, text):
        return "does not match the expected format"
    return None


class WorkflowEngine:
    def __init__(self, spec: WorkflowSpec) -> None:
        self.spec = spec
        self.steps: Dict[str, StepSpec] = {s.id: s for s in spec.steps}
        self.slot_specs: Dict[str, SlotSpec] = {s.id: s for s in spec.slots}

    # ---- lifecycle ----------------------------------------------------------------------------------------------------------
    def start(self) -> RunState:
        st = RunState(self.spec.id, self.spec.version, self.spec.start)
        self._enter(st, self.spec.start, "start")
        return st

    def step(self, st: RunState) -> StepSpec:
        return self.steps[st.state]

    def next_slot(self, st: RunState) -> Optional[str]:
        """The one thing to ask next: the current collect step's first missing REQUIRED slot (optional ones are offered, not asked)."""
        step = self.step(st)
        if st.status != "active" or step.kind != "collect":
            return None
        return next((s for s in step.slots if self.slot_specs[s].required and s not in st.slots), None)

    # ---- observations -------------------------------------------------------------------------------------------------------
    def set_slots(self, st: RunState, values: Dict[str, Any]) -> None:
        """Take the declared slots from `values` that pass validation; undeclared keys are ignored, bad values recorded."""
        for key, value in (values or {}).items():
            spec = self.slot_specs.get(key)
            if spec is None or value in (None, ""):
                continue
            problem = slot_problem(spec, value)
            if problem:
                st.rejected[key] = problem
                continue
            st.slots[key] = str(value).strip().lower() if spec.type == "enum" else value
            st.rejected.pop(key, None)

    def advance(self, st: RunState, *, slots: Optional[Dict[str, Any]] = None, tool: Optional[str] = None,
                code: Optional[str] = None, resolved: Optional[bool] = None) -> RunState:
        """Apply what happened (new slot values, one tool result, the caller's "that answers it") and move as far as the rules allow."""
        if st.status != "active":
            return st
        self.set_slots(st, slots or {})
        consumed_tool = False
        for _ in range(len(self.steps) * 3):  # never spins: each pass either moves or stops
            step = self.step(st)
            if step.kind in ("complete", "fail"):
                break
            event: Dict[str, Any] = {}
            if step.kind == "collect":
                if any(self.slot_specs[s].required and s not in st.slots for s in step.slots):
                    break
            elif step.kind == "answer":
                if resolved is None:
                    break
                event["resolved"] = resolved
                resolved = None  # one answer outcome moves one step
            elif step.kind in ("tool", "confirm", "transfer"):
                wanted = "transfer_to_human" if step.kind == "transfer" else step.tool
                if consumed_tool or tool != wanted or code is None:
                    break
                event["code"] = code
                consumed_tool = True
            target = self._transition(st, step, event)
            if target is None:
                break
            self._enter(st, target, step.id)
            if st.status != "active":
                break
        return st

    # ---- internals ----------------------------------------------------------------------------------------------------------
    def _holds(self, st: RunState, cond: Condition, event: Dict[str, Any]) -> bool:
        if any(s not in st.slots for s in cond.slots_present):
            return False
        if any(str(st.slots.get(k, "")).lower() != v.lower() for k, v in cond.slot_equals.items()):
            return False
        if cond.tool_code_in and event.get("code") not in cond.tool_code_in:
            return False
        if cond.resolved is not None and event.get("resolved") is not cond.resolved:
            return False
        return True

    def _transition(self, st: RunState, step: StepSpec, event: Dict[str, Any]) -> Optional[str]:
        for t in step.next:
            if self._holds(st, t.when, event):
                return t.to
        return None

    def _enter(self, st: RunState, target: str, came_from: str) -> None:
        visits = st.visits.get(target, 0) + 1
        st.visits[target] = visits
        step = self.steps[target]
        if visits > step.max_visits:
            st.status, st.outcome = "failed", "loop_exceeded"
            st.history.append({"from": came_from, "to": target, "why": "loop_exceeded"})
            logger.warning("[WORKFLOW] %s entered %s %d times: ending the run", self.spec.id, target, visits)
            return
        st.state = target
        st.history.append({"from": came_from, "to": target, "why": "transition"})
        if step.kind == "complete":
            st.status, st.outcome = "completed", step.outcome
        elif step.kind == "fail":
            st.status, st.outcome = "failed", step.outcome


class WorkflowStore:
    """Saves and loads runs in `workflow_runs`, one row per (business, conversation, workflow). Saving is an upsert, so a retried
    save never makes a second row."""

    def __init__(self, db_factory: Callable[[], Any]) -> None:
        self.db_factory = db_factory

    def load(self, business_id: str, conversation_id: str, workflow_id: str) -> Optional[RunState]:
        from backend.server.database.models.vertical import WorkflowRun

        with self.db_factory() as db:
            row = db.query(WorkflowRun).filter_by(business_id=business_id, conversation_id=conversation_id, workflow_id=workflow_id).first()
            if row is None:
                return None
            return RunState(row.workflow_id, row.workflow_version, row.state, row.status, row.outcome,
                            dict(row.slots or {}), dict(row.visits or {}), list(row.history or []))

    def save(self, business_id: str, conversation_id: str, st: RunState) -> None:
        from backend.server.database.models.vertical import WorkflowRun

        data = st.to_row()
        with self.db_factory() as db:
            row = db.query(WorkflowRun).filter_by(business_id=business_id, conversation_id=conversation_id, workflow_id=st.workflow_id).first()
            if row is None:
                row = WorkflowRun(business_id=business_id, conversation_id=conversation_id, workflow_id=st.workflow_id)
                db.add(row)
            row.workflow_version = data["workflow_version"]
            row.state, row.status, row.outcome = data["state"], data["status"], data["outcome"]
            row.slots, row.visits, row.history = data["slots"], data["visits"], data["history"][-50:]
            row.updated_at = datetime.now(timezone.utc)
            db.commit()
