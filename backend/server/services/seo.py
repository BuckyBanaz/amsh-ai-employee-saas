"""SEO configuration for the public marketing site: defaults, validation, health checks, robots.txt, sitemap.xml and JSON-LD.

Stored in `seo_settings` (one "global" row and one "page:<path>" row per configured page). The admin portal edits it; the marketing
site reads it through the public `/api/seo/*` endpoints. Nothing here is guessed: a page with no entry inherits the site defaults.
"""

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.server.database.models.seo_setting import SeoSetting

GLOBAL_KEY = "global"
PAGE_PREFIX = "page:"
CHANGEFREQ = ("always", "hourly", "daily", "weekly", "monthly", "yearly", "never")
TITLE_RANGE = (30, 60)
DESCRIPTION_RANGE = (70, 160)

# Public pages of the user app that can carry SEO settings. Pages behind a login are never listed or indexed.
KNOWN_PAGES: List[Dict[str, Any]] = [
    {"path": "/landing", "label": "Home / landing page", "index": True},
    {"path": "/register", "label": "Create account", "index": True},
    {"path": "/login", "label": "Sign in", "index": False},
]

PRIVATE_PATHS = ["/dashboard", "/settings", "/onboarding", "/api/", "/ai", "/calls", "/patients", "/appointments", "/billing", "/team"]

DEFAULT_GLOBAL: Dict[str, Any] = {
    "site_name": "AMSh",
    "site_url": "",
    "title_template": "%s | AMSh",
    "default_title": "AMSh: Your Clinic's 24/7 AI Employee",
    "default_description": "AMSh answers calls and WhatsApp chats, books appointments and follows up with patients, even when your team is busy or your clinic is closed.",
    "default_og_image": "",
    "twitter_handle": "",
    "locale": "en_IN",
    "index_site": True,
    "disallow_paths": PRIVATE_PATHS,
    "verification": {"google": "", "bing": ""},
    "analytics": {"ga4_id": "", "gtm_id": ""},
    "organization": {"name": "AMSh", "logo_url": "", "phone": "", "email": "", "same_as": []},
}

_URL = re.compile(r"^https?://[^\s<>\"']{3,490}$")
_PATH = re.compile(r"^/[A-Za-z0-9/_\-.]{0,119}$")
_GA4 = re.compile(r"^G-[A-Z0-9]{4,12}$")
_GTM = re.compile(r"^GTM-[A-Z0-9]{4,10}$")
_TWITTER = re.compile(r"^@?\w{1,15}$")
_LOCALE = re.compile(r"^[a-z]{2}_[A-Z]{2}$")
_TOKEN = re.compile(r"^[A-Za-z0-9_\-]{0,120}$")


class SeoError(ValueError):
    """A setting that cannot be saved; the message is safe to show in the admin portal."""


def _text(value: Any, name: str, limit: int) -> str:
    v = str(value or "").strip()
    if len(v) > limit:
        raise SeoError(f"{name} is too long (limit {limit} characters)")
    if "<" in v or ">" in v:
        raise SeoError(f"{name} cannot contain < or >")
    return v


def _url(value: Any, name: str, allow_empty: bool = True) -> str:
    v = str(value or "").strip()
    if not v:
        if allow_empty:
            return ""
        raise SeoError(f"{name} is required")
    if not _URL.match(v):
        raise SeoError(f"{name} must be a full http(s) URL")
    return v.rstrip("/") if name == "Site URL" else v


def clean_global(raw: Dict[str, Any]) -> Dict[str, Any]:
    g = json.loads(json.dumps(DEFAULT_GLOBAL))
    g["site_name"] = _text(raw.get("site_name", g["site_name"]), "Site name", 60) or g["site_name"]
    g["site_url"] = _url(raw.get("site_url", g["site_url"]), "Site URL")
    template = _text(raw.get("title_template", g["title_template"]), "Title template", 80)
    if "%s" not in template:
        raise SeoError("Title template must contain %s where the page title goes")
    g["title_template"] = template
    g["default_title"] = _text(raw.get("default_title", g["default_title"]), "Default title", 120)
    g["default_description"] = _text(raw.get("default_description", g["default_description"]), "Default description", 320)
    g["default_og_image"] = _url(raw.get("default_og_image", ""), "Default social image")
    handle = str(raw.get("twitter_handle", "") or "").strip()
    if handle and not _TWITTER.match(handle):
        raise SeoError("Twitter / X handle looks wrong (letters, numbers, underscore, up to 15)")
    g["twitter_handle"] = ("@" + handle.lstrip("@")) if handle else ""
    locale = str(raw.get("locale", g["locale"]) or "").strip()
    if not _LOCALE.match(locale):
        raise SeoError("Locale must look like en_IN or en_US")
    g["locale"] = locale
    g["index_site"] = bool(raw.get("index_site", True))
    paths = raw.get("disallow_paths", g["disallow_paths"])
    if not isinstance(paths, list) or len(paths) > 50 or any(not isinstance(p, str) or not p.startswith("/") or len(p) > 120 or re.search(r"[\s<>\"']", p) for p in paths):
        raise SeoError("Blocked paths must be a list of paths that start with /")
    g["disallow_paths"] = list(dict.fromkeys(paths))
    ver = raw.get("verification") or {}
    g["verification"] = {}
    for k in ("google", "bing"):
        token = str(ver.get(k, "") or "").strip()
        if not _TOKEN.match(token):
            raise SeoError(f"{k.title()} verification code has unexpected characters")
        g["verification"][k] = token
    an = raw.get("analytics") or {}
    ga4, gtm = str(an.get("ga4_id", "") or "").strip(), str(an.get("gtm_id", "") or "").strip()
    if ga4 and not _GA4.match(ga4):
        raise SeoError("Google Analytics ID looks like G-XXXXXXXXXX")
    if gtm and not _GTM.match(gtm):
        raise SeoError("Tag Manager ID looks like GTM-XXXXXXX")
    g["analytics"] = {"ga4_id": ga4, "gtm_id": gtm}
    org = raw.get("organization") or {}
    same_as = org.get("same_as") or []
    if not isinstance(same_as, list) or len(same_as) > 10:
        raise SeoError("Social profiles must be a list of up to 10 URLs")
    g["organization"] = {
        "name": _text(org.get("name", g["site_name"]), "Organization name", 80) or g["site_name"],
        "logo_url": _url(org.get("logo_url", ""), "Organization logo"),
        "phone": _text(org.get("phone", ""), "Organization phone", 30),
        "email": _text(org.get("email", ""), "Organization email", 120),
        "same_as": [_url(u, "Social profile URL", allow_empty=False) for u in same_as],
    }
    return g


def clean_page(raw: Dict[str, Any]) -> Dict[str, Any]:
    path = str(raw.get("path", "") or "").strip()
    if not _PATH.match(path):
        raise SeoError("Path must start with / and use letters, numbers, - _ . /")
    canonical = str(raw.get("canonical", "") or "").strip()
    if canonical and not _URL.match(canonical):
        raise SeoError("Canonical URL must be a full http(s) URL")
    freq = str(raw.get("changefreq", "monthly") or "monthly")
    if freq not in CHANGEFREQ:
        raise SeoError(f"Change frequency must be one of: {', '.join(CHANGEFREQ)}")
    try:
        priority = float(raw.get("priority", 0.5))
    except (TypeError, ValueError):
        raise SeoError("Priority must be a number between 0 and 1")
    if not 0 <= priority <= 1:
        raise SeoError("Priority must be between 0 and 1")
    return {
        "path": path, "title": _text(raw.get("title"), "Title", 120), "description": _text(raw.get("description"), "Description", 320),
        "og_image": _url(raw.get("og_image", ""), "Social image"), "canonical": canonical, "noindex": bool(raw.get("noindex", False)),
        "changefreq": freq, "priority": round(priority, 2),
    }


def load(db: Session) -> Dict[str, Any]:
    rows = {r.key: r for r in db.scalars(select(SeoSetting)).all()}
    g = json.loads(json.dumps(DEFAULT_GLOBAL))
    if GLOBAL_KEY in rows:
        for k, v in (rows[GLOBAL_KEY].data or {}).items():
            g[k] = v
    pages = {k[len(PAGE_PREFIX):]: dict(r.data or {}, path=k[len(PAGE_PREFIX):]) for k, r in rows.items() if k.startswith(PAGE_PREFIX)}
    updated = max((r.updated_at for r in rows.values() if r.updated_at), default=None)
    return {"global": g, "pages": pages, "updated_at": updated.isoformat() if updated else None}


def save(db: Session, key: str, data: Dict[str, Any], user_id: Optional[str]) -> None:
    row = db.get(SeoSetting, key)
    now = datetime.now(timezone.utc)
    if row is None:
        db.add(SeoSetting(key=key, data=data, updated_by=user_id, updated_at=now))
    else:
        row.data, row.updated_by, row.updated_at = data, user_id, now
    db.commit()


def delete_page(db: Session, path: str) -> bool:
    row = db.get(SeoSetting, PAGE_PREFIX + path)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def default_noindex(path: str) -> bool:
    """Known pages that should not be listed (sign-in) are noindex until an admin says otherwise."""
    return any(k["path"] == path and not k["index"] for k in KNOWN_PAGES)


def effective(g: Dict[str, Any], page: Optional[Dict[str, Any]], path: str) -> Dict[str, Any]:
    """What a visitor / crawler gets for `path`: the page's own values over the site defaults."""
    page = page or {}
    title = page.get("title") or g["default_title"]
    full_title = g["title_template"].replace("%s", title) if page.get("title") else title
    canonical = page.get("canonical") or (g["site_url"] + path if g["site_url"] else "")
    return {
        "path": path, "title": title, "full_title": full_title, "description": page.get("description") or g["default_description"],
        "og_image": page.get("og_image") or g["default_og_image"], "canonical": canonical,
        "noindex": bool(page.get("noindex", default_noindex(path))) or not g["index_site"],
    }


def organization_json_ld(g: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    org = g.get("organization") or {}
    if not org.get("name") or not g.get("site_url"):
        return None
    data: Dict[str, Any] = {"@context": "https://schema.org", "@type": "Organization", "name": org["name"], "url": g["site_url"]}
    if org.get("logo_url"):
        data["logo"] = org["logo_url"]
    if org.get("same_as"):
        data["sameAs"] = org["same_as"]
    if org.get("phone") or org.get("email"):
        point: Dict[str, Any] = {"@type": "ContactPoint", "contactType": "customer support"}
        if org.get("phone"):
            point["telephone"] = org["phone"]
        if org.get("email"):
            point["email"] = org["email"]
        data["contactPoint"] = point
    return data


def public_view(db: Session) -> Dict[str, Any]:
    cfg = load(db)
    g = cfg["global"]
    paths = list(dict.fromkeys([p["path"] for p in KNOWN_PAGES] + list(cfg["pages"])))
    return {
        "site_name": g["site_name"], "site_url": g["site_url"], "locale": g["locale"], "twitter_handle": g["twitter_handle"],
        "verification": g["verification"], "analytics": g["analytics"], "json_ld": organization_json_ld(g),
        "pages": {p: effective(g, cfg["pages"].get(p), p) for p in paths},
    }


def robots_txt(g: Dict[str, Any]) -> str:
    lines = ["User-agent: *"]
    if not g["index_site"]:
        lines.append("Disallow: /")
    else:
        lines.append("Allow: /")
        lines += [f"Disallow: {p}" for p in g["disallow_paths"]]
    if g["site_url"]:
        lines += ["", f"Sitemap: {g['site_url']}/sitemap.xml"]  # the marketing site serves /sitemap.xml from this API
    return "\n".join(lines) + "\n"


def sitemap_urls(g: Dict[str, Any], pages: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not g["site_url"] or not g["index_site"]:
        return []
    out = []
    for path in dict.fromkeys([k["path"] for k in KNOWN_PAGES] + list(pages)):
        page = pages.get(path) or {}
        if effective(g, page, path)["noindex"]:
            continue
        out.append({"loc": g["site_url"] + path, "changefreq": page.get("changefreq", "monthly"), "priority": page.get("priority", 0.8 if path == "/landing" else 0.5)})
    return out


def sitemap_xml(g: Dict[str, Any], pages: Dict[str, Dict[str, Any]], now: Optional[datetime] = None) -> str:
    stamp = (now or datetime.now(timezone.utc)).date().isoformat()
    body = "".join(
        f"<url><loc>{escape(u['loc'])}</loc><lastmod>{stamp}</lastmod><changefreq>{u['changefreq']}</changefreq><priority>{u['priority']}</priority></url>"
        for u in sitemap_urls(g, pages)
    )
    return f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'


def health(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Problems a crawler or a searcher would notice, by severity: error (blocks indexing), warning (hurts results), info (an opportunity)."""
    g, pages = cfg["global"], cfg["pages"]
    issues: List[Dict[str, str]] = []

    def add(level: str, where: str, message: str) -> None:
        issues.append({"level": level, "where": where, "message": message})

    if not g["index_site"]:
        add("error", "Site", "The whole site is hidden from search engines (index_site is off).")
    if not g["site_url"]:
        add("error", "Site", "Site URL is not set: the sitemap is empty and canonical links cannot be built.")
    if not g["default_og_image"]:
        add("warning", "Site", "No default social sharing image: links shared on WhatsApp, LinkedIn and X show no preview picture.")
    if not (g["analytics"]["ga4_id"] or g["analytics"]["gtm_id"]):
        add("info", "Site", "No analytics ID: visits to the marketing site are not measured.")
    if not (g["verification"]["google"] or g["verification"]["bing"]):
        add("info", "Site", "Search Console / Bing Webmaster verification is not set.")
    if not organization_json_ld(g):
        add("info", "Site", "Structured data (Organization) needs a site URL and organization name.")
    elif not g["organization"]["logo_url"]:
        add("info", "Site", "Add an organization logo URL so search engines can show your logo.")
    seen_title: Dict[str, str] = {}
    seen_desc: Dict[str, str] = {}
    for known in KNOWN_PAGES + [{"path": p, "label": p, "index": True} for p in pages if p not in {k["path"] for k in KNOWN_PAGES}]:
        path = known["path"]
        e = effective(g, pages.get(path), path)
        if e["noindex"] and known["index"]:
            add("warning", path, "This page is set to noindex, so search engines will not list it.")
        if e["noindex"]:
            continue
        n = len(e["full_title"])
        if n < TITLE_RANGE[0] or n > TITLE_RANGE[1]:
            add("warning", path, f"Title is {n} characters; {TITLE_RANGE[0]} to {TITLE_RANGE[1]} shows fully in results.")
        d = len(e["description"])
        if d < DESCRIPTION_RANGE[0] or d > DESCRIPTION_RANGE[1]:
            add("warning", path, f"Description is {d} characters; {DESCRIPTION_RANGE[0]} to {DESCRIPTION_RANGE[1]} shows fully in results.")
        if e["full_title"] in seen_title:
            add("warning", path, f"Same title as {seen_title[e['full_title']]}: give each page its own.")
        seen_title.setdefault(e["full_title"], path)
        if e["description"] in seen_desc:
            add("warning", path, f"Same description as {seen_desc[e['description']]}: give each page its own.")
        seen_desc.setdefault(e["description"], path)
        if not e["og_image"]:
            add("info", path, "No social sharing image.")
    score = max(0, 100 - 20 * sum(i["level"] == "error" for i in issues) - 6 * sum(i["level"] == "warning" for i in issues) - sum(i["level"] == "info" for i in issues))
    return {"score": score, "issues": issues}
