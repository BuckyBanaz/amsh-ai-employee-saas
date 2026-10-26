"""One call's workflows: which run is active, what the model should do next, and the persisted runs.

Fed only by trusted observations: the toolbox's own audit trail of calls (`AgentToolbox.calls`: tool name, parsed arguments, real
result code) and the controller's code-parsed slots. The model's prose never moves a workflow.

Healthcare ("clinic") does not use a session: its booking order and notes stay the controller's, exactly as captured in the clinic
golden; its workflows in definitions/healthcare.yaml document that behaviour and drive its tool allowlist only.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, List, Optional

from backend.ai.workflows.engine import RunState, WorkflowEngine, WorkflowStore
from backend.ai.workflows.registry import workflow_registry
from backend.ai.workflows.schema import WorkflowSpec

logger = logging.getLogger(__name__)

# Tool argument -> workflow slot. Arguments keep their historical names (the booking tool's "patient_name" is the caller's name
# in every vertical); this map is the one place that translates them.
ARG_SLOTS: Dict[str, str] = {
    "patient_name": "name", "name": "name", "contact_name": "name",
    "phone_number": "phone", "phone": "phone",
    "service_name": "service", "preferred_date": "date", "preferred_time": "time", "new_date": "date", "new_time": "time",
    "doctor_name": "doctor", "email": "email", "topic": "topic", "subject": "programme", "programme": "programme",
    "product": "product", "applicant_type": "applicant_type", "study_level": "study_level", "grade": "grade",
    "batch_preference": "batch_preference", "student_first_name": "student_first_name",
}
CONTROLLER_SLOTS = ("service", "date", "time", "name", "phone")


class WorkflowSession:
    def __init__(self, business_id: str, conversation_id: Optional[str], vertical: str, subtype: Optional[str],
                 db_factory: Optional[Callable[[], Any]] = None, persist: bool = True) -> None:
        self.business_id = business_id
        self.conversation_id = conversation_id
        self.specs: List[WorkflowSpec] = workflow_registry().workflows_for(vertical, subtype)
        self.engines: Dict[str, WorkflowEngine] = {wf.id: WorkflowEngine(wf) for wf in self.specs}
        self.runs: Dict[str, RunState] = {}
        self.active: Optional[str] = None
        self._seen_calls = 0
        self.store = WorkflowStore(db_factory) if (persist and db_factory and conversation_id) else None
        self._saver = ThreadPoolExecutor(max_workers=1, thread_name_prefix="wf-save") if self.store else None  # ordered saves

    # ---- runs -------------------------------------------------------------------------------------------------------------
    def run(self, workflow_id: str) -> RunState:
        if workflow_id not in self.runs:
            loaded = None
            if self.store:
                try:
                    loaded = self.store.load(self.business_id, self.conversation_id, workflow_id)
                except Exception as e:  # a database hiccup never breaks the call: start fresh in memory
                    logger.warning("[WORKFLOW] could not load %s: %s", workflow_id, e)
            self.runs[workflow_id] = loaded or self.engines[workflow_id].start()
        return self.runs[workflow_id]

    def _workflow_for_tool(self, tool: str) -> Optional[str]:
        """The active workflow when it allows the tool; else the first of the business's workflows that does."""
        if self.active and tool in self.engines[self.active].spec.tools and self.runs.get(self.active, None) and self.runs[self.active].status == "active":
            return self.active
        for wf in self.specs:
            if tool in wf.tools and tool not in ("end_call", "search_knowledge"):
                return wf.id
        return None

    def _save(self, workflow_id: str) -> None:
        if not self.store or not self._saver:
            return
        snapshot = RunState(**{**self.runs[workflow_id].to_row(), "rejected": {}})
        store, business_id, conversation_id = self.store, self.business_id, self.conversation_id

        def save() -> None:
            try:
                store.save(business_id, conversation_id, snapshot)
            except Exception as e:
                logger.warning("[WORKFLOW] could not save %s: %s", snapshot.workflow_id, e)

        self._saver.submit(save)

    # ---- observations -----------------------------------------------------------------------------------------------------
    def sync(self, tool_calls: List[Dict[str, Any]], known: Dict[str, str]) -> None:
        """Apply the tool calls made since the last sync (in order) and the controller's known slots."""
        changed = set()
        for call in tool_calls[self._seen_calls:]:
            name = call.get("tool") or ""
            wid = self._workflow_for_tool(name)
            if not wid:
                continue
            self.active = wid
            engine, st = self.engines[wid], self.run(wid)
            args = call.get("args") or {}
            slots = {ARG_SLOTS[k]: v for k, v in args.items() if k in ARG_SLOTS and v not in (None, "")}
            code = str(call.get("result_code") or "")
            if engine.step(st).kind == "answer":  # the caller needed more than an answer: the question was not resolved
                engine.advance(st, resolved=False)
            engine.advance(st, slots=slots)
            engine.advance(st, tool=name, code=code)
            changed.add(wid)
        self._seen_calls = len(tool_calls)
        if self.active is None and known:  # nothing called yet: track what the caller gave against the first workflow
            self.active = self.specs[0].id
        if self.active:
            st = self.run(self.active)
            before = dict(st.slots)
            self.engines[self.active].advance(st, slots={k: v for k, v in known.items() if k in CONTROLLER_SLOTS})
            if st.slots != before:
                changed.add(self.active)
        for wid in changed:
            self._save(wid)

    def mark_resolved(self) -> None:
        """The caller confirmed their question was answered (code-detected): an active answer step completes."""
        if self.active:
            st = self.run(self.active)
            engine = self.engines[self.active]
            if engine.step(st).kind == "answer":
                engine.advance(st, resolved=True)
                self._save(self.active)

    def context(self) -> Dict[str, Any]:
        """The active run's validated slots (topic, applicant type, study level...): what department routing may match on."""
        if not self.active:
            return {}
        return dict(self.run(self.active).slots)

    # ---- guidance for the model -------------------------------------------------------------------------------------------
    def note(self) -> Optional[str]:
        if not self.active:
            return None
        engine = self.engines[self.active]
        st = self.run(self.active)
        if st.status != "active":
            return f"WORKFLOW {engine.spec.title}: finished ({st.outcome}). Do not repeat it; ask if there is anything else."
        step = engine.step(st)
        parts = [f"WORKFLOW {engine.spec.title}: at step '{step.id}'"]
        if step.description:
            parts.append(step.description)
        nxt = engine.next_slot(st)
        if nxt:
            spec = engine.slot_specs[nxt]
            parts.append(f"ask only for {nxt}" + (f" ({spec.description})" if spec.description else ""))
        if st.rejected:
            parts.append("not accepted: " + ", ".join(f"{k} ({why})" for k, why in st.rejected.items()))
        if engine.spec.answer_constraints:
            parts.append("rules: " + "; ".join(engine.spec.answer_constraints))
        return ". ".join(parts) + "."

    def close(self) -> None:
        if self._saver:
            self._saver.shutdown(wait=True)
