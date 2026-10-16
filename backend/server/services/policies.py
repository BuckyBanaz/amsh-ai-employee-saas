"""Policy and privacy management.

Policy documents (Terms, Privacy, a DPA...) are published by the platform and apply to a business by region and vertical; the owner
accepts them when onboarding, and again when a new version asks for it. Policy *rules* steer the AI itself: the privacy clause in its
instructions and the recording notice it speaks at the start of a call. Both resolve the same way: the most specific scope wins.

Scope region: `*`, a country code (IN, US...), or a privacy framework (DPDP, GDPR, HIPAA). Scope vertical: `*` or a vertical (clinic...).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.ai.verticals.regions import REGION_PROFILES, RegionProfile, region_profile
from backend.server.database.models.business import Business
from backend.server.database.models.policy import Policy, PolicyAcceptance, PolicyRule, PolicyVersion
from backend.server.database.models.user import User
from backend.server.services.audit import audit

SIGNUP_KEYS = ("terms", "privacy")  # accepted when creating an account, before any business or region exists
MIN_BODY = 40
FRAMEWORKS = ("DPDP", "GDPR", "HIPAA")
REGION_CHOICES = ["*", *REGION_PROFILES.keys(), *FRAMEWORKS]

BUILTIN_RECORDING_NOTICE = {
    "en": "Please note that this call may be recorded to help us serve you better.",
    "hi": "कृपया ध्यान दें, सेवा बेहतर बनाने के लिए यह कॉल रिकॉर्ड की जा सकती है।",
}


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    dt = _aware(dt)
    return dt.isoformat() if dt else None


# ---------------------------------------------------------------------------------------------------------- scope matching
def scope_score(region: str, vertical: str, profile: RegionProfile, business_vertical: str) -> Optional[int]:
    """How well a (region, vertical) scope fits a business: None = does not apply; higher = more specific."""
    if region == "*":
        r = 1
    elif region == profile.code and profile.code != "UNKNOWN":
        r = 3
    elif region and region == profile.privacy:
        r = 2
    else:
        return None
    if vertical == "*":
        return r
    return r + 4 if vertical == (business_vertical or "").strip().lower() else None


# --------------------------------------------------------------------------------------------------------------- documents
def current_version(db: Session, policy_id: str) -> Optional[PolicyVersion]:
    return db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy_id, PolicyVersion.status == "published")).first()


def applicable(db: Session, country: str, vertical: str) -> List[Tuple[Policy, PolicyVersion]]:
    """Published policies that apply to this region and vertical: per key, the most specific one."""
    profile = region_profile(country)
    best: Dict[str, Tuple[int, Policy, PolicyVersion]] = {}
    for p in db.scalars(select(Policy).where(Policy.status == "active")).all():
        score = scope_score(p.scope_region, p.scope_vertical, profile, vertical)
        if score is None:
            continue
        v = current_version(db, p.id)
        if v and (p.key not in best or score > best[p.key][0]):
            best[p.key] = (score, p, v)
    return [(p, v) for _, p, v in sorted(best.values(), key=lambda t: (t[1].key != "terms", t[1].key != "privacy", t[1].key))]


def _accepted(db: Session, policy: Policy, version: PolicyVersion, user: Optional[User], business_id: Optional[str]) -> Optional[PolicyAcceptance]:
    """The acceptance that covers this version for this person or business, if any. An earlier version counts when the current one
    does not ask for re-acceptance."""
    ids = [version.id]
    if not version.requires_reacceptance:
        ids = [v for (v,) in db.execute(select(PolicyVersion.id).where(PolicyVersion.policy_id == policy.id)).all()]
    conds = []
    if user is not None:
        conds.append(PolicyAcceptance.user_id == user.id)
    if business_id:
        conds.append(PolicyAcceptance.business_id == business_id)
    if not conds:
        return None
    from sqlalchemy import or_

    return db.scalars(select(PolicyAcceptance).where(PolicyAcceptance.version_id.in_(ids), or_(*conds))).first()


def business_status(db: Session, business: Business, user: Optional[User]) -> Dict[str, Any]:
    items = []
    for p, v in applicable(db, business.country or "", business.vertical or ""):
        acc = _accepted(db, p, v, user, business.id)
        items.append({"policy_id": p.id, "version_id": v.id, "key": p.key, "title": p.title, "version": v.version, "summary": v.summary,
                      "body": v.body, "requires_acceptance": p.requires_acceptance, "accepted": bool(acc), "accepted_at": _iso(acc.accepted_at) if acc else None,
                      "published_at": _iso(v.published_at)})
    pending = [i for i in items if i["requires_acceptance"] and not i["accepted"]]
    return {"items": items, "pending": len(pending), "ai": ai_summary(db, business)}


def require_accepted(db: Session, business: Business, user: User) -> None:
    """Raises ValueError naming what is missing when a required policy for this business has not been accepted. Platform staff are not asked:
    they act for the business, they do not accept on its behalf."""
    if user.scope == "platform":
        return
    missing = [i["title"] for i in business_status(db, business, user)["items"] if i["requires_acceptance"] and not i["accepted"]]
    if missing:
        raise ValueError("Accept these policies before continuing: " + ", ".join(missing))


def accept(db: Session, user: User, business: Optional[Business], version_ids: List[str], ip: Optional[str], user_agent: Optional[str]) -> int:
    """Record acceptance of the given versions. Only a version that is currently published, and that applies to the business (or to every
    sign-up), can be accepted. Raises ValueError otherwise. Returns how many new acceptances were recorded."""
    allowed = {v.id: (p, v) for p, v in (applicable(db, business.country or "", business.vertical or "") if business else signup_policies(db))}
    made = 0
    for vid in dict.fromkeys(version_ids):
        if vid not in allowed:
            raise ValueError("That policy version is not current for this business")
        p, v = allowed[vid]
        if db.scalars(select(PolicyAcceptance).where(PolicyAcceptance.user_id == user.id, PolicyAcceptance.version_id == v.id)).first():
            continue
        db.add(PolicyAcceptance(policy_id=p.id, version_id=v.id, version=v.version, user_id=user.id, business_id=business.id if business else None,
                                ip=(ip or None), user_agent=(user_agent or "")[:300] or None))
        made += 1
    db.commit()
    for vid in version_ids:
        if vid in allowed:
            p, v = allowed[vid]
            audit(db, "policy.accepted", user, business_id=business.id if business else None, target_type="policy", target_id=p.id, ip=ip, meta={"key": p.key, "version": v.version})
    return made


def signup_policies(db: Session) -> List[Tuple[Policy, PolicyVersion]]:
    """Terms and Privacy that apply to everyone (global scope), published, and needing acceptance."""
    out = []
    for p in db.scalars(select(Policy).where(Policy.status == "active", Policy.scope_region == "*", Policy.scope_vertical == "*", Policy.key.in_(SIGNUP_KEYS), Policy.requires_acceptance.is_(True))).all():
        v = current_version(db, p.id)
        if v:
            out.append((p, v))
    return out


# ---------------------------------------------------------------------------------------------------------- AI rules
def rule_data(db: Session, country: str, vertical: str) -> Dict[str, Any]:
    """The platform's edits for this region and vertical: least specific first, so a more specific rule overrides key by key."""
    profile = region_profile(country)
    scored = []
    for r in db.scalars(select(PolicyRule)).all():
        s = scope_score(r.scope_region, r.scope_vertical, profile, vertical)
        if s is not None:
            scored.append((s, r.data or {}))
    merged: Dict[str, Any] = {}
    for _, data in sorted(scored, key=lambda t: t[0]):
        merged.update({k: v for k, v in data.items() if v not in (None, "")})
    return merged


def recording_notice(rule: Dict[str, Any], language: str = "en") -> str:
    """What the AI says about recording, or "" when the platform switched the notice off for this scope."""
    if rule.get("recording_notice_enabled") is False:
        return ""
    custom = rule.get("recording_notice") or {}
    lang = (language or "en")[:2].lower()
    return str(custom.get(lang) or custom.get("en") or BUILTIN_RECORDING_NOTICE.get(lang) or BUILTIN_RECORDING_NOTICE["en"]).strip()


def greeting_with_notice(db: Session, business: Business, greeting: str, record_on: bool, language: str = "en") -> str:
    """The opening line plus the recording notice, when this business records calls and its region's rule asks for a notice."""
    if not record_on:
        return greeting
    notice = recording_notice(rule_data(db, business.country or "", business.vertical or ""), language)
    return f"{greeting} {notice}".strip() if notice else greeting


def greeting_for(business_id: str, greeting: str, language: Optional[str] = None) -> str:
    """Blocking (run it in a thread). The call's opening line with the recording notice added when this business records calls and its
    region's rule asks for one. If this cannot be worked out the call still goes ahead with the plain greeting, and the failure is logged."""
    import logging

    from backend.ai.engine.agent.facts import load_profile
    from backend.ai.engine.conversation.i18n import language_code
    from backend.server.database.session import SessionLocal

    try:
        with SessionLocal() as db:
            business = db.get(Business, business_id)
            if not business:
                return greeting
            return greeting_with_notice(db, business, greeting, load_profile(db, business_id).record, language_code(language))
    except Exception:
        logging.getLogger(__name__).exception("[POLICY] could not add the recording notice for %s", business_id)
        return greeting


def ai_summary(db: Session, business: Business) -> Dict[str, Any]:
    """What the AI does for this business's region, shown to the owner: nothing here is a promise the code does not keep."""
    from backend.ai.engine.agent.facts import load_profile
    from backend.ai.verticals.compliance import get_regional_compliance

    profile = region_profile(business.country or "")
    base = get_regional_compliance(vertical=business.vertical or "clinic", country=business.country or "", timezone=business.timezone or "")
    rule = rule_data(db, business.country or "", business.vertical or "")
    record_on = load_profile(db, business.id).record
    notice = recording_notice(rule, "en") if record_on else ""
    return {
        "region": profile.name if profile.code != "UNKNOWN" else "Not recognised (set the business country)",
        "framework": base["framework"],
        "emergency": base["emergency_code"],
        "privacy_instruction": bool(rule.get("compliance_clause") or base["compliance_clause"]),
        "custom_privacy_instruction": bool(rule.get("compliance_clause")),
        "recording_on": record_on,
        "recording_notice": notice,
    }


# ------------------------------------------------------------------------------------------------------- admin: documents
STARTER_NOTE = "> STARTER DRAFT. This is a structure to edit, not legal advice. Have a lawyer review and complete it before you publish.\n\n"
STARTERS: List[Dict[str, Any]] = [
    {"key": "terms", "title": "Terms of Service", "region": "*", "vertical": "*", "body": STARTER_NOTE + "# Terms of Service\n\n## 1. Who we are\nAMSh provides an AI receptionist service to businesses.\n\n## 2. Your account\nYou are responsible for your account, your team's use of it, and the accuracy of the information you give.\n\n## 3. Acceptable use\nDo not use the service to break the law or to contact people who have not agreed to be contacted.\n\n## 4. Payment and plans\nPlans, prices, trials and cancellation follow what you chose at checkout.\n\n## 5. Ending the service\nEither side may end the agreement; what happens to your data is set out in the Privacy Policy.\n\n## 6. Contact\nWrite to the address on our website."},
    {"key": "privacy", "title": "Privacy Policy", "region": "*", "vertical": "*", "body": STARTER_NOTE + "# Privacy Policy\n\n## 1. What we collect\nAccount details, your business information, call audio and transcripts, appointment details, and messages sent through the service.\n\n## 2. Why we collect it\nTo answer calls and messages for your business, book appointments, and improve the service.\n\n## 3. Who sees it\nYour team, and providers that process data for us (speech, language models, telephony, messaging, hosting).\n\n## 4. Call recording\nCalls may be recorded when your business has recording on. The AI tells callers at the start of the call.\n\n## 5. How long we keep it\nState your retention period here.\n\n## 6. Your rights\nHow to ask for access, correction or deletion.\n\n## 7. Contact\nName the person or team responsible for privacy."},
    {"key": "dpa", "title": "Data Processing Addendum (GDPR)", "region": "GDPR", "vertical": "*", "body": STARTER_NOTE + "# Data Processing Addendum (GDPR)\n\nCovers AMSh acting as a processor for a business in the EU or UK: subject matter and duration, types of personal data, security measures, sub-processors, assistance with data-subject requests, breach notification, return or deletion at the end of the service."},
    {"key": "dpa", "title": "Data Processing Addendum (DPDP, India)", "region": "DPDP", "vertical": "*", "body": STARTER_NOTE + "# Data Processing Addendum (DPDP, India)\n\nCovers AMSh acting as a data processor for a business in India: purpose and notice to callers, consent, security safeguards, processors engaged, handling of grievances, breach intimation, erasure at the end of the service."},
    {"key": "baa", "title": "Business Associate Agreement (HIPAA)", "region": "HIPAA", "vertical": "clinic", "body": STARTER_NOTE + "# Business Associate Agreement (HIPAA)\n\nFor a US clinic whose calls involve protected health information: permitted uses, safeguards, reporting of incidents, subcontractors, access and amendment, return or destruction of PHI at the end of the service."},
]


def create_policy(db: Session, user: User, key: str, title: str, region: str, vertical: str, requires_acceptance: bool, body: str, summary: str = "") -> Policy:
    key, region, vertical = key.strip().lower(), region.strip() or "*", vertical.strip().lower() or "*"
    if not key.replace("_", "").replace("-", "").isalnum():
        raise ValueError("The key may use letters, numbers, dashes and underscores only")
    if region not in REGION_CHOICES:
        raise ValueError(f"Region must be one of {', '.join(REGION_CHOICES)}")
    if db.scalars(select(Policy).where(Policy.key == key, Policy.scope_region == region, Policy.scope_vertical == vertical)).first():
        raise ValueError("A policy with this key, region and vertical already exists")
    p = Policy(key=key, title=title.strip()[:160], scope_region=region, scope_vertical=vertical, requires_acceptance=requires_acceptance)
    db.add(p)
    db.flush()
    db.add(PolicyVersion(policy_id=p.id, version=1, body=body, summary=summary[:500], status="draft", created_by=user.id))
    db.commit()
    return p


def save_draft(db: Session, user: User, policy: Policy, body: str, summary: str, requires_reacceptance: bool, title: Optional[str] = None) -> PolicyVersion:
    if title and title.strip():
        policy.title = title.strip()[:160]
    draft = db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy.id, PolicyVersion.status == "draft")).first()
    if not draft:
        nxt = (db.scalar(select(func.max(PolicyVersion.version)).where(PolicyVersion.policy_id == policy.id)) or 0) + 1
        draft = PolicyVersion(policy_id=policy.id, version=nxt, created_by=user.id)
        db.add(draft)
    draft.body, draft.summary, draft.requires_reacceptance = body, summary[:500], requires_reacceptance
    db.commit()
    return draft


def publish(db: Session, user: User, policy: Policy) -> PolicyVersion:
    draft = db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy.id, PolicyVersion.status == "draft")).first()
    if not draft:
        raise ValueError("There is no draft to publish")
    if len((draft.body or "").strip()) < MIN_BODY:
        raise ValueError(f"The text is too short to publish (at least {MIN_BODY} characters)")
    if policy.status != "active":
        raise ValueError("This policy is archived")
    for old in db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy.id, PolicyVersion.status == "published")).all():
        old.status = "superseded"
    draft.status, draft.published_at, draft.published_by = "published", datetime.now(timezone.utc), user.id
    db.commit()
    return draft


def list_policies(db: Session) -> List[Dict[str, Any]]:
    out = []
    for p in db.scalars(select(Policy).order_by(Policy.key, Policy.scope_region, Policy.scope_vertical)).all():
        versions = db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == p.id).order_by(PolicyVersion.version.desc())).all()
        pub = next((v for v in versions if v.status == "published"), None)
        draft = next((v for v in versions if v.status == "draft"), None)
        accepted = db.scalar(select(func.count(func.distinct(PolicyAcceptance.user_id))).where(PolicyAcceptance.version_id == pub.id)) if pub else 0
        out.append({"id": p.id, "key": p.key, "title": p.title, "scope_region": p.scope_region, "scope_vertical": p.scope_vertical, "requires_acceptance": p.requires_acceptance,
                    "status": p.status, "published_version": pub.version if pub else None, "published_at": _iso(pub.published_at) if pub else None,
                    "has_draft": draft is not None, "accepted_count": accepted or 0})
    return out


def policy_detail(db: Session, p: Policy) -> Dict[str, Any]:
    versions = db.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == p.id).order_by(PolicyVersion.version.desc())).all()
    counts = dict(db.execute(select(PolicyAcceptance.version_id, func.count()).where(PolicyAcceptance.policy_id == p.id).group_by(PolicyAcceptance.version_id)).all())
    return {"id": p.id, "key": p.key, "title": p.title, "scope_region": p.scope_region, "scope_vertical": p.scope_vertical, "requires_acceptance": p.requires_acceptance, "status": p.status,
            "versions": [{"id": v.id, "version": v.version, "status": v.status, "body": v.body, "summary": v.summary, "requires_reacceptance": v.requires_reacceptance,
                          "created_at": _iso(v.created_at), "published_at": _iso(v.published_at), "accepted_count": counts.get(v.id, 0)} for v in versions]}


def acceptances(db: Session, policy_id: str, version_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q = select(PolicyAcceptance, User.email, Business.name).join(User, User.id == PolicyAcceptance.user_id).outerjoin(Business, Business.id == PolicyAcceptance.business_id).where(PolicyAcceptance.policy_id == policy_id)
    if version_id:
        q = q.where(PolicyAcceptance.version_id == version_id)
    rows = db.execute(q.order_by(PolicyAcceptance.accepted_at.desc()).limit(limit)).all()
    return [{"id": a.id, "version": a.version, "email": email, "business": name, "accepted_at": _iso(a.accepted_at), "ip": a.ip} for a, email, name in rows]


def seed_starters(db: Session, user: User) -> int:
    made = 0
    for s in STARTERS:
        if db.scalars(select(Policy).where(Policy.key == s["key"], Policy.scope_region == s["region"], Policy.scope_vertical == s["vertical"])).first():
            continue
        create_policy(db, user, s["key"], s["title"], s["region"], s["vertical"], True, s["body"])
        made += 1
    return made


# --------------------------------------------------------------------------------------------------------- admin: AI rules
def rules_overview(db: Session) -> Dict[str, Any]:
    """Every saved rule, plus what the AI says today for each built-in region (with and without edits), so an editor sees the effect."""
    from backend.ai.verticals.compliance import get_regional_compliance

    saved = [{"id": r.id, "scope_region": r.scope_region, "scope_vertical": r.scope_vertical, "data": r.data or {}, "updated_at": _iso(r.updated_at)} for r in db.scalars(select(PolicyRule).order_by(PolicyRule.scope_region, PolicyRule.scope_vertical)).all()]
    regions = []
    for code, prof in REGION_PROFILES.items():
        base = get_regional_compliance(vertical="clinic", country=code)
        rule = rule_data(db, code, "clinic")
        regions.append({"code": code, "name": prof.name, "framework": base["framework"], "emergency": base["emergency_code"], "built_in_clause": base["compliance_clause"],
                        "effective_clause": rule.get("compliance_clause") or base["compliance_clause"], "effective_notice": recording_notice(rule, "en"), "notice_enabled": rule.get("recording_notice_enabled") is not False})
    return {"rules": saved, "regions": regions, "built_in_notice": BUILTIN_RECORDING_NOTICE, "scopes": REGION_CHOICES}


def save_rule(db: Session, user: User, region: str, vertical: str, data: Dict[str, Any]) -> Optional[PolicyRule]:
    """Save a rule; saving one with nothing set removes it (back to the built-in text) and returns None."""
    region, vertical = (region or "*").strip(), (vertical or "*").strip().lower() or "*"
    if region not in REGION_CHOICES:
        raise ValueError(f"Region must be one of {', '.join(REGION_CHOICES)}")
    clean: Dict[str, Any] = {}
    clause = str(data.get("compliance_clause") or "").strip()
    if clause:
        if len(clause) > 900:
            raise ValueError("The privacy instruction is too long (900 characters at most): it is sent to the AI on every turn")
        clean["compliance_clause"] = clause
    notice = {k: str(v).strip() for k, v in (data.get("recording_notice") or {}).items() if k in ("en", "hi") and str(v).strip()}
    if any(len(t) > 300 for t in notice.values()):
        raise ValueError("The recording notice is too long (300 characters at most): it is spoken at the start of every call")
    if notice:
        clean["recording_notice"] = notice
    if data.get("recording_notice_enabled") is False:
        clean["recording_notice_enabled"] = False
    row = db.scalars(select(PolicyRule).where(PolicyRule.scope_region == region, PolicyRule.scope_vertical == vertical)).first()
    if not clean:
        if row:
            db.delete(row)
            db.commit()
        return None
    if not row:
        row = PolicyRule(scope_region=region, scope_vertical=vertical)
        db.add(row)
    row.data, row.updated_by, row.updated_at = clean, user.id, datetime.now(timezone.utc)
    db.commit()
    return row
