"""System prompt for the LLM receptionist. Layout is cache-friendly: static rules first, per-tenant facts next,
per-call facts last. Facts come only from the database; the prompt forbids inventing anything else.
Kept deliberately short: every prompt token is paid on every turn and counts against the provider's TPM limit.

All wording lives in the prompt pack `ai/prompts/receptionist.json` (see `ai/prompts/__init__.py`); this module only chooses and
fills the templates. Language-specific wording comes from the language packs (`ai/lexicon.py`).

The dashboard's Behavior tab reaches the model here: personality, owner instructions, small-talk toggle,
confirmation toggle and disabled capabilities."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.ai.capabilities.rules.business_hours import BusinessHoursRule
from backend.ai.lexicon import language_pack
from backend.ai.prompts import load_prompts
from backend.ai.verticals.context import BusinessContext
from backend.ai.engine.agent.validator import BusinessFacts


from backend.ai.engine.agent.availability import normalize_working_hours


def _pack(vertical: Optional[str] = None) -> Dict[str, Any]:
    return load_prompts("receptionist", vertical)  # healthcare has no overlay: the base pack


def _hours_text(working_hours: Any, vertical: Optional[str] = None) -> str:
    hours = _pack(vertical)["hours"]
    working_hours = normalize_working_hours(working_hours)
    if not working_hours:
        return hours["not_configured"]
    parts = []
    for day, ranges in working_hours.items():
        if isinstance(ranges, list) and ranges:
            spans = ", ".join(
                hours["span"].format(start=r.get("start") or r.get("open"), end=r.get("end") or r.get("close"))
                for r in ranges
                if isinstance(r, dict)
            )
            parts.append(hours["day"].format(day=day[:3], spans=spans))
        elif isinstance(ranges, str) and ranges:
            parts.append(hours["day"].format(day=day[:3], spans=ranges))
        else:
            parts.append(hours["closed"].format(day=day[:3]))
    return hours["separator"].join(parts)


def _lang_name(code: str, vertical: Optional[str] = None) -> str:
    key = (code or "en").lower().split("-")[0]
    return language_pack(key).get("name") or _pack(vertical)["language_names"].get(key[:2], code)


def _native_style(code: str, vertical: Optional[str] = None) -> str:
    """How to sound native in `code`: its pack's style guidance and filler words, or a generic native-speaker instruction."""
    pack = language_pack(code)
    style_templates = _pack(vertical)["native_style"]
    name = _lang_name(code, vertical)
    if pack.get("style"):
        fillers = pack.get("fillers") or {}
        sample = ", ".join(dict.fromkeys(w.strip("…!. ") for k in ("think", "ack") for w in fillers.get(k, [])))
        return style_templates["with_pack"].format(name=name.upper(), style=pack["style"]) + (
            style_templates["fillers"].format(sample=sample) if sample else ""
        )
    return style_templates["generic"].format(name=name.upper())


def language_rule(primary: Optional[str], languages: Optional[List[str]], auto_detect: bool, vertical: Optional[str] = None) -> str:
    """Languages tab: the primary language, the ones the clinic supports, and whether to follow the caller."""
    templates = _pack(vertical)["language_rule"]
    p = _lang_name(primary or "en", vertical)
    primary_code = (primary or "en").lower().split("-")[0]
    native = _native_style(primary_code, vertical) if primary_code != "en" else ""
    if not auto_detect:
        return templates["fixed"].format(primary=p, native=native)
    allowed = {c.lower().split("-")[0] for c in (languages or [])} | {primary_code}
    base = templates["no_hindi"] if (languages and "hi" not in allowed) else templates["with_hindi"]  # no Hindi: no Devanagari guidance
    rule = base.format(primary=p)
    supported = [_lang_name(c, vertical) for c in (languages or [])]
    if supported and set(supported) != {p}:
        rule += templates["supported"].format(supported=", ".join(supported), primary=p)
    return rule + native


def trigger_lines(triggers: Optional[Dict[str, bool]], vertical: Optional[str] = None) -> str:
    """Escalation-tab rules the model itself must follow (transfers themselves are enforced in code)."""
    lines_by_trigger = _pack(vertical)["triggers"]
    t = triggers or {}
    lines = []
    if t.get("frustration", True):
        lines.append(lines_by_trigger["frustration"])
    if t.get("failed_answer", True):
        lines.append(lines_by_trigger["failed_answer"])
    if t.get("complex_billing"):
        lines.append(lines_by_trigger["complex_billing"])
    return _pack(vertical)["facts"]["escalation_separator"].join(lines)


def personality_line(personality: Optional[str], vertical: Optional[str] = None) -> str:
    pack = _pack(vertical)
    key = (personality or "").strip().lower()
    if key in pack["personalities"]:
        return pack["personalities"][key]
    if key:
        return pack["custom_personality"].format(personality=personality.strip())  # a custom value the owner typed
    return pack["personalities"][pack["default_personality"]]


def runtime_context_block(context: Optional[BusinessContext]) -> str:
    """The authoritative runtime context for the model: vertical, language, accent, region, timezone. The five are independent;
    the model uses them as given and never derives one from another (Hindi is not India, an accent is not a region)."""
    if context is None:
        return ""
    t = _pack(context.vertical)["runtime_context"]
    language = t["language"].format(name=_lang_name(context.language, context.vertical), code=context.language, rtl=t["rtl"] if context.direction == "rtl" else "")
    accent = context.accent or t["accent_none"]
    if context.region == "UNKNOWN":
        region = t["region_unknown"]
    else:
        numbers = t["numbers_join"].join(context.emergency_numbers) or t["numbers_none"]
        region = t["region_known"].format(region_name=context.region_name, region=context.region, numbers=numbers)
    return t["block"].format(vertical=context.vertical, language=language, accent=accent, region=region, timezone=context.timezone)


def workflow_block(facts: BusinessFacts, pack: Dict[str, Any]) -> str:
    """For verticals on the workflow runtime: what this business handles (its subtype's workflows, from the reviewed definitions),
    its departments (the tenant's directory) and its courses. Empty for healthcare, whose prompt is frozen by the clinic golden."""
    from backend.ai.workflows.registry import workflow_registry

    registry = workflow_registry()
    vertical = registry.vertical(facts.vertical)
    if not vertical.workflow_runtime:
        return ""
    t = pack["workflow_block"]
    sep = t["separator"]
    subtype = vertical.subtype(getattr(facts, "subtype", "")) or vertical.subtypes[0]
    out = t["header"].format(vertical=vertical.name, subtype=subtype.name)
    for wf in registry.workflows_for(facts.vertical, subtype.key):
        # A booking has a fixed order; an enquiry's questions depend on its path, so the per-turn workflow note gives them instead.
        order = t["order"].format(slots=", ".join(wf.slot_order)) if (wf.booking_type and wf.slot_order) else ""
        rules = t["rules"].format(rules=sep.join(wf.answer_constraints)) if wf.answer_constraints else ""
        out += t["workflow"].format(title=wf.title, intents=", ".join(i.replace("_", " ") for i in wf.entry_intents), order=order, rules=rules)
    departments = list(getattr(facts, "departments", None) or [])
    if departments:
        items = [t["department_item"].format(key=d["key"], name=d["name"], intents=", ".join(str(i).replace("_", " ") for i in d.get("intents") or []) or d["name"],
                                             answer="" if d.get("may_answer", True) else t["department_no_answer"]) for d in departments]
        out += t["departments"].format(items=sep.join(items))
    else:
        out += t["no_departments"]
    courses = list(getattr(facts, "courses", None) or [])
    if courses:
        out += t["courses"].format(items=sep.join(courses))
    return out


def build_system_prompt(
    facts: BusinessFacts,
    agent_name: str,
    now: datetime,
    caller_number: str,
    tone: Optional[str] = None,
    gender: Optional[str] = None,
    instructions: Optional[str] = None,
    small_talk: bool = True,
    require_confirmation: bool = True,
    disabled: Optional[List[str]] = None,
    transfers_on: bool = True,
    primary_language: Optional[str] = "en",
    languages: Optional[List[str]] = None,
    auto_detect_language: bool = True,
    triggers: Optional[Dict[str, bool]] = None,
    channel: str = "voice",
    context: Optional[BusinessContext] = None,
) -> str:
    vertical = facts.vertical
    pack = _pack(vertical)
    fp = pack["facts"]
    gender_rule = pack["gender"].get(gender or "", pack["gender"]["unknown"]) if gender in ("female", "male") else pack["gender"]["unknown"]
    rules = pack["rules"].format(
        agent_name=agent_name or fp["default_agent_name"],
        business_name=facts.name,
        personality=personality_line(tone, vertical),
        emotion_rule=pack["emotion_rule"],
        language_rule=language_rule(primary_language, languages, auto_detect_language, vertical),
        gender_rule=gender_rule,
        small_talk=pack["small_talk_on"] if small_talk else pack["small_talk_off"],
        confirm_flow=pack["confirm_on"] if require_confirmation else pack["confirm_off"],
    )
    rules = rules + "\n" + pack["privacy_rule"]
    if channel == "chat":
        for voice, chat in pack["channel"]["replacements"]:
            rules = rules.replace(voice, chat)
        rules = rules + pack["channel"]["chat_addendum"]
    sep = fp["list_separator"]
    location = sep.join(p for p in (facts.address, facts.city) if p) or fp["not_on_file"]
    prompt = fp["block"].format(
        rules=rules,
        runtime=runtime_context_block(context),
        name=facts.name,
        location=location,
        phone=facts.phone or fp["not_on_file"],
        hours=_hours_text(facts.working_hours, vertical),
        services=sep.join(facts.services) or fp["not_listed"],
        doctors=sep.join(facts.doctors) or fp["not_listed"],
        now=now.strftime(fp["now_format"]),
        timezone=facts.timezone,
        open_now=BusinessHoursRule.describe(facts.working_hours, now),
        caller=caller_number or fp["unknown"],
    )
    prompt += workflow_block(facts, pack)
    escalation = trigger_lines(triggers, vertical) if transfers_on else ""  # every escalation line hands the caller to a person
    if escalation:
        prompt += fp["escalation"].format(text=escalation)
    if disabled:
        prompt += fp["disabled"].format(items=fp["disabled_separator"].join(disabled))
    if not transfers_on and channel != "chat":  # (chat has its own no-transfer line)
        # Many rules and tool results say "offer the front desk": with transfers off that offer cannot be kept, and the
        # caller who says yes is then told "sorry, I can't". This line overrides them.
        prompt += fp["no_transfer"]
    from backend.ai.verticals.compliance import get_regional_compliance
    compliance = get_regional_compliance(
        vertical=facts.vertical,  # required: BusinessFacts has no default vertical
        country=getattr(facts, "country", ""),
        timezone=facts.timezone,
    )
    compliance_clause = getattr(facts, "compliance_clause", "") or compliance.get("compliance_clause", "")  # the platform's edit wins over the built-in text
    if compliance_clause:
        prompt += fp["policy"].format(clause=compliance_clause)

    text = (instructions or "").strip()
    if text:
        prompt += fp["owner_instructions"].format(text=text[: pack["limits"]["max_instructions_chars"]])
    return prompt
