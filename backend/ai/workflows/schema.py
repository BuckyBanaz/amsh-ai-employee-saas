"""Typed schemas for vertical definitions and their workflows.

Separate concepts (DOCS/31 §3), each its own type here:

  vertical     VerticalDefinition    the industry: terminology, subtypes, department templates, safety switches
  subtype      SubtypeSpec           a business type inside the vertical; picks its OWN workflows (not "every subtype shares one")
  workflow     WorkflowSpec          the process run for an intent: slots in order, steps, tools, transfer policy, outcome
  department   DepartmentTemplate    a human team calls can be routed to (a tenant gives each one a real destination)
  resource     ResourceKind          what a booking holds: staff, room, campus...
  intent       WorkflowSpec.entry_intents
  tool         WorkflowSpec.tools    an application operation; a workflow can only use the tools it lists
  policy       SafetyPolicy / TransferPolicy

Everything is declarative DATA, loaded from `backend/ai/workflows/definitions/*.yaml` with `extra="forbid"`, so a typo is an error at
load time, never a silently ignored key. No field is ever executed: conditions are matched by code against slot values and tool
result codes. Code-level behaviour (transactions, security checks, external calls) lives in the toolbox's typed handlers.
"""

import re
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_KEY = r"^[a-z][a-z0-9_]{1,40}$"  # stable identifiers: lowercase slug


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# ---- slots and steps ------------------------------------------------------------------------------------------------------------

SlotType = Literal["text", "name", "phone", "email", "date", "time", "enum", "boolean"]


class SlotSpec(_Strict):
    """One piece of information a workflow collects."""

    id: str = Field(pattern=_KEY)
    type: SlotType = "text"
    required: bool = True
    description: str = ""
    allowed_values: List[str] = Field(default_factory=list)  # for "enum"
    validation: Optional[str] = None  # a regular expression the value must match (checked by code)
    sensitive: bool = False  # personal data: never read back in full, never logged in clear
    about_minor: bool = False  # concerns a child (schools): ask only if the workflow truly needs it

    @field_validator("validation")
    @classmethod
    def _compiles(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            try:
                re.compile(value)  # an invalid pattern fails at load time, not on a live call
            except re.error as e:
                raise ValueError(f"invalid validation pattern {value!r}: {e}") from e
        return value


class Condition(_Strict):
    """When a transition applies. Every listed test must hold; an empty condition always holds (use it last, as the default)."""

    slots_present: List[str] = Field(default_factory=list)
    slot_equals: Dict[str, str] = Field(default_factory=dict)
    tool_code_in: List[str] = Field(default_factory=list)  # the step's tool returned one of these result codes
    resolved: Optional[bool] = None  # the caller said their question was answered (answer steps)


class Transition(_Strict):
    to: str = Field(pattern=_KEY)
    when: Condition = Field(default_factory=Condition)


StepKind = Literal["collect", "answer", "tool", "confirm", "transfer", "complete", "fail"]


class StepSpec(_Strict):
    id: str = Field(pattern=_KEY)
    kind: StepKind
    description: str = ""
    slots: List[str] = Field(default_factory=list)  # collect: asked in this order, one per turn
    tool: Optional[str] = None  # tool / confirm: the operation this step runs
    department: Optional[str] = None  # transfer: a department key, or "route" to choose by the department routing rules
    outcome: Optional[str] = None  # complete / fail: what the run ends as (booked, lead_captured, transferred, answered, ...)
    next: List[Transition] = Field(default_factory=list)
    max_visits: int = Field(default=3, ge=1, le=10)  # every loop is bounded: a step entered more often than this fails the run


class TransferPolicy(_Strict):
    departments: List[str] = Field(default_factory=list)  # the only departments this workflow may transfer to ("route" = by rules)
    require_caller_consent: bool = True  # the caller asked or agreed (emergencies excepted)
    collect_before_transfer: List[str] = Field(default_factory=list)  # slot ids gathered first so the human does not re-ask
    on_unavailable: Literal["fallback_then_callback", "callback", "message"] = "fallback_then_callback"


class WorkflowSpec(_Strict):
    id: str = Field(pattern=r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")  # "<vertical>.<name>"
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    title: str
    description: str = ""
    status: Literal["implemented", "designed"] = "designed"  # "implemented" only when code, tests and wiring exist
    entry_intents: List[str] = Field(min_length=1)
    slots: List[SlotSpec] = Field(default_factory=list)
    start: str = Field(pattern=_KEY)
    steps: List[StepSpec] = Field(min_length=1)
    tools: List[str] = Field(default_factory=list)  # allowlist: no other tool can run inside this workflow
    knowledge: List[Literal["business_facts", "catalog", "faq", "documents"]] = Field(default_factory=list)
    answer_constraints: List[str] = Field(default_factory=list)  # e.g. "fees only from the configured catalog"
    transfer: TransferPolicy = Field(default_factory=TransferPolicy)
    booking_type: Optional[str] = None  # appointment / campus_visit / counselling / demo_class / treatment
    resources: List[str] = Field(default_factory=list)  # resource kinds a booking holds
    follow_ups: List[str] = Field(default_factory=list)  # e.g. "confirmation_message", "callback_task", "reminder"
    audit_events: List[str] = Field(default_factory=list)
    metrics: List[str] = Field(default_factory=list)

    @property
    def slot_order(self) -> List[str]:
        """The order the workflow asks for its REQUIRED slots: collect steps in step order, each step's slots in order, first
        wins. Optional slots (a preferred stylist) are offered by the conversation, never demanded."""
        required = {s.id for s in self.slots if s.required}
        seen: List[str] = []
        for step in self.steps:
            if step.kind == "collect":
                seen.extend(s for s in step.slots if s in required and s not in seen)
        return seen


# ---- departments, resources, subtypes, the vertical ---------------------------------------------------------------------------

class DepartmentTemplate(_Strict):
    """A human team. The template is platform data; each tenant gives it a destination, hours and fallback (`departments` table)."""

    key: str = Field(pattern=_KEY)
    name: str
    intents: List[str] = Field(default_factory=list)  # what this department handles (routing rules match on these)
    match: Dict[str, str] = Field(default_factory=dict)  # caller context that must also hold, e.g. {applicant_type: international}
    may_answer: bool = True  # the AI may answer this topic from approved information before offering a transfer
    required_slots: List[str] = Field(default_factory=list)  # gather these before transferring
    priority: int = Field(default=50, ge=0, le=100)  # urgent teams first when several match
    default_fallback: Optional[str] = None  # another department key tried when this one is unavailable


class ResourceKind(_Strict):
    key: str = Field(pattern=_KEY)  # staff / room / campus / equipment
    name: str
    capacity_limited: bool = True


class OnboardingStep(_Strict):
    key: str = Field(pattern=_KEY)
    title: str
    required: bool = True


class NavItem(_Strict):
    key: str = Field(pattern=_KEY)
    label: str
    route: str = Field(pattern=r"^/[a-z0-9/_-]*$")


class Terminology(_Strict):
    customer: str
    customers: str
    staff: str
    staff_plural: str
    offering: str  # a service / course / treatment
    offerings: str
    booking: str
    bookings: str


class SafetyPolicy(_Strict):
    emergency_detection: bool = True  # always on: an emergency can happen anywhere
    emergency_wording: Literal["medical", "general"] = "general"
    health_privacy: bool = False  # HIPAA / DPDP health-data rules
    minors_privacy: bool = False  # children's data: ask only what is needed, guardian contact first
    no_medical_advice: bool = True
    no_outcome_claims: bool = False  # never promise treatment results (wellness)


class SubtypeSpec(_Strict):
    key: str = Field(pattern=_KEY)
    name: str
    workflows: List[str] = Field(min_length=1)
    departments: List[str] = Field(default_factory=list)  # department templates suggested for this subtype
    resources: List[str] = Field(default_factory=list)
    terminology: Optional[Terminology] = None  # overrides the vertical's
    differences: List[str] = Field(default_factory=list)  # documented: what this subtype does differently


class VerticalDefinition(_Strict):
    key: str = Field(pattern=_KEY)  # Business.vertical
    name: str
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    status: Literal["live", "beta", "designed"] = "designed"
    description: str = ""
    # true: calls run a WorkflowSession (tracked, persisted runs and per-turn workflow notes). false: the conversation controller
    # alone drives the call (healthcare, whose behaviour is frozen by the clinic golden); its workflows still set the tool allowlist.
    workflow_runtime: bool = True
    terminology: Terminology
    safety: SafetyPolicy = Field(default_factory=SafetyPolicy)
    subtypes: List[SubtypeSpec] = Field(min_length=1)
    departments: List[DepartmentTemplate] = Field(default_factory=list)
    resources: List[ResourceKind] = Field(default_factory=list)
    onboarding: List[OnboardingStep] = Field(min_length=1)
    dashboard: List[NavItem] = Field(min_length=1)

    def subtype(self, key: Optional[str]) -> Optional[SubtypeSpec]:
        return next((s for s in self.subtypes if s.key == key), None)

    def department(self, key: str) -> Optional[DepartmentTemplate]:
        return next((d for d in self.departments if d.key == key), None)
