"""Workflow registry: loads every vertical definition and workflow, validates them as a whole, and answers "what runs for this
business" (vertical + subtype -> its workflows, tools, slot order, departments).

Validation runs at load time (process start, and in tests) and REFUSES a definition with:
  - an unknown tool (not one the toolbox implements) or a step tool missing from the workflow's own allowlist
  - a step, transition or start that points at a step that does not exist, or a step with no way out
  - a loop with no bounded exit: every step must be able to reach a terminal (complete / fail) step
  - a slot used by a step or condition that the workflow does not declare
  - a transfer to a department the vertical does not define
  - a subtype naming a workflow, department or resource kind that does not exist, or a workflow of another vertical
Nothing here is tenant-editable and nothing is executed: definitions are reviewed YAML shipped with the code.
"""

from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

import yaml

from backend.ai.verticals.errors import UnknownVerticalError
from backend.ai.workflows.schema import VerticalDefinition, WorkflowSpec

DEFINITIONS_DIR = Path(__file__).parent / "definitions"

# The operations the agent toolbox implements (`AgentToolbox._tool_<name>`); test_workflows checks the two stay in sync.
KNOWN_TOOLS: Set[str] = {
    "check_availability", "book_appointment", "lookup_appointment", "cancel_appointment", "reschedule_appointment",
    "send_confirmation", "search_knowledge", "transfer_to_human", "end_call", "capture_enquiry",
}
TERMINAL = {"complete", "fail"}


class WorkflowDefinitionError(ValueError):
    """A vertical or workflow definition is invalid; the message lists every problem found."""


def validate_workflow(wf: WorkflowSpec, departments: Iterable[str] = ()) -> List[str]:
    """Every problem with one workflow (empty when it is valid)."""
    problems: List[str] = []
    where = wf.id
    steps = {s.id: s for s in wf.steps}
    if len(steps) != len(wf.steps):
        problems.append(f"{where}: duplicate step ids")
    slots = {s.id for s in wf.slots}
    if len(slots) != len(wf.slots):
        problems.append(f"{where}: duplicate slot ids")
    if wf.start not in steps:
        problems.append(f"{where}: start step {wf.start!r} does not exist")
    for tool in wf.tools:
        if tool not in KNOWN_TOOLS:
            problems.append(f"{where}: unknown tool {tool!r}")
    known_departments = set(departments)
    for dep in wf.transfer.departments:
        if dep != "route" and dep not in known_departments:
            problems.append(f"{where}: transfer policy names undefined department {dep!r}")
    for slot in wf.transfer.collect_before_transfer:
        if slot not in slots:
            problems.append(f"{where}: transfer policy collects undeclared slot {slot!r}")

    for step in wf.steps:
        at = f"{where}.{step.id}"
        for slot in step.slots:
            if slot not in slots:
                problems.append(f"{at}: undeclared slot {slot!r}")
        if step.kind in ("tool", "confirm"):
            if not step.tool:
                problems.append(f"{at}: a {step.kind} step needs a tool")
            elif step.tool not in wf.tools:
                problems.append(f"{at}: tool {step.tool!r} is not in the workflow's allowlist")
        if step.kind == "collect" and not step.slots:
            problems.append(f"{at}: a collect step needs slots")
        if step.kind == "transfer":
            if "transfer_to_human" not in wf.tools:
                problems.append(f"{at}: transfer step but transfer_to_human is not allowed")
            if not step.department:
                problems.append(f"{at}: transfer step needs a department")
            elif step.department != "route" and step.department not in wf.transfer.departments:
                problems.append(f"{at}: department {step.department!r} is not in the workflow's transfer policy")
        if step.kind in TERMINAL:
            if step.next:
                problems.append(f"{at}: a {step.kind} step cannot have transitions")
            if not step.outcome:
                problems.append(f"{at}: a {step.kind} step needs an outcome")
        elif not step.next:
            problems.append(f"{at}: no way out (add a transition)")
        for t in step.next:
            if t.to not in steps:
                problems.append(f"{at}: transition to missing step {t.to!r}")
            for slot in list(t.when.slots_present) + list(t.when.slot_equals):
                if slot not in slots:
                    problems.append(f"{at}: condition on undeclared slot {slot!r}")
        if step.next and step.next[-1].when.model_dump(exclude_defaults=True):
            problems.append(f"{at}: the last transition must be unconditional (the default), so the step always has an exit")

    # bounded exit: from every step some terminal step must be reachable
    terminal = {s.id for s in wf.steps if s.kind in TERMINAL}
    reaches: Set[str] = set(terminal)
    changed = True
    while changed:
        changed = False
        for step in wf.steps:
            if step.id not in reaches and any(t.to in reaches for t in step.next):
                reaches.add(step.id)
                changed = True
    for step in wf.steps:
        if step.id not in reaches:
            problems.append(f"{where}.{step.id}: cannot reach a complete/fail step (a loop with no exit)")
    return problems


def validate_vertical(vertical: VerticalDefinition, workflows: Dict[str, WorkflowSpec]) -> List[str]:
    problems: List[str] = []
    dep_keys = [d.key for d in vertical.departments]
    if len(set(dep_keys)) != len(dep_keys):
        problems.append(f"{vertical.key}: duplicate department keys")
    for dep in vertical.departments:
        if dep.default_fallback and dep.default_fallback not in dep_keys:
            problems.append(f"{vertical.key}: department {dep.key!r} falls back to undefined {dep.default_fallback!r}")
        if dep.default_fallback == dep.key:
            problems.append(f"{vertical.key}: department {dep.key!r} falls back to itself")
    resource_keys = {r.key for r in vertical.resources}
    sub_keys = [s.key for s in vertical.subtypes]
    if len(set(sub_keys)) != len(sub_keys):
        problems.append(f"{vertical.key}: duplicate subtype keys")
    for sub in vertical.subtypes:
        for wid in sub.workflows:
            wf = workflows.get(wid)
            if wf is None:
                problems.append(f"{vertical.key}.{sub.key}: unknown workflow {wid!r}")
            elif not wid.startswith(vertical.key + "."):
                problems.append(f"{vertical.key}.{sub.key}: workflow {wid!r} belongs to another vertical")
        for dep in sub.departments:
            if dep not in dep_keys:
                problems.append(f"{vertical.key}.{sub.key}: unknown department {dep!r}")
        for res in sub.resources:
            if res not in resource_keys:
                problems.append(f"{vertical.key}.{sub.key}: unknown resource kind {res!r}")
    for wid, wf in workflows.items():
        if wid.startswith(vertical.key + "."):
            problems.extend(validate_workflow(wf, dep_keys))
            for res in wf.resources:
                if res not in resource_keys:
                    problems.append(f"{wid}: unknown resource kind {res!r}")
    return problems


class WorkflowRegistry:
    def __init__(self, verticals: Dict[str, VerticalDefinition], workflows: Dict[str, WorkflowSpec]) -> None:
        problems: List[str] = []
        for vertical in verticals.values():
            problems.extend(validate_vertical(vertical, workflows))
        orphans = [wid for wid in workflows if wid.split(".")[0] not in verticals]
        problems.extend(f"{wid}: no vertical {wid.split('.')[0]!r} defines it" for wid in orphans)
        if problems:
            raise WorkflowDefinitionError("Invalid vertical/workflow definitions:\n  " + "\n  ".join(problems))
        self.verticals = verticals
        self.workflows = workflows

    @classmethod
    def from_dir(cls, path: Path = DEFINITIONS_DIR) -> "WorkflowRegistry":
        verticals: Dict[str, VerticalDefinition] = {}
        workflows: Dict[str, WorkflowSpec] = {}
        for file in sorted(path.glob("*.yaml")):
            raw = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
            vertical = VerticalDefinition.model_validate(raw["vertical"])
            if vertical.key in verticals:
                raise WorkflowDefinitionError(f"vertical {vertical.key!r} is defined twice")
            verticals[vertical.key] = vertical
            for item in raw.get("workflows") or []:
                wf = WorkflowSpec.model_validate(item)
                if wf.id in workflows:
                    raise WorkflowDefinitionError(f"workflow {wf.id!r} is defined twice")
                workflows[wf.id] = wf
        return cls(verticals, workflows)

    # ---- lookups ------------------------------------------------------------------------------------------------------------
    def vertical(self, key: Optional[str]) -> VerticalDefinition:
        k = str(key or "").strip().lower()
        if k not in self.verticals:
            raise UnknownVerticalError(f"No vertical definition for {key!r}.")
        return self.verticals[k]

    def workflows_for(self, vertical: Optional[str], subtype: Optional[str] = None) -> List[WorkflowSpec]:
        """The workflows a business runs: its subtype's list, or (no / unknown subtype) the vertical's first subtype's."""
        v = self.vertical(vertical)
        sub = v.subtype(subtype) or v.subtypes[0]
        return [self.workflows[w] for w in sub.workflows]

    def tools_for(self, vertical: Optional[str], subtype: Optional[str] = None) -> List[str]:
        """The tool allowlist for a business: the union of its workflows' tools, in first-seen order."""
        out: List[str] = []
        for wf in self.workflows_for(vertical, subtype):
            out.extend(t for t in wf.tools if t not in out)
        return out

    def booking_slot_order(self, vertical: Optional[str], subtype: Optional[str] = None) -> Tuple[str, ...]:
        """The order the business's booking workflow asks for things (the first workflow that books)."""
        for wf in self.workflows_for(vertical, subtype):
            if "book_appointment" in wf.tools:
                return tuple(wf.slot_order)
        return ()


@lru_cache(maxsize=1)
def workflow_registry() -> WorkflowRegistry:
    """The process-wide registry, validated once. An invalid definition stops startup with every problem listed."""
    return WorkflowRegistry.from_dir()
