"""SEO: the admin portal edits it, the public marketing site reads it.

Platform admin (`require_platform_admin`):
    GET    /api/admin/seo                 site defaults, page overrides, health score and issues, robots / sitemap / JSON-LD previews
    PUT    /api/admin/seo/global          save the site defaults (name, URL, title template, social image, robots, analytics, organization)
    PUT    /api/admin/seo/pages           save one page's title, description, social image, canonical, noindex, sitemap hints
    DELETE /api/admin/seo/pages?path=     remove a page override (it inherits the defaults again)

Public (the marketing site, crawlers; cached for 5 minutes):
    GET /api/seo/public                   what the site needs per page (title, description, image, canonical, noindex) + analytics + JSON-LD
    GET /api/seo/robots.txt
    GET /api/seo/sitemap.xml
"""

from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from backend.server.auth.security import require_platform_admin
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import seo
from backend.server.services.audit import audit, client_ip

admin_router = APIRouter(prefix="/api/admin/seo", tags=["admin-seo"])
public_router = APIRouter(prefix="/api/seo", tags=["seo"])
CACHE = {"Cache-Control": "public, max-age=300"}


def _bad(err: seo.SeoError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


def _overview(db: Session) -> Dict[str, Any]:
    cfg = seo.load(db)
    g, pages = cfg["global"], cfg["pages"]
    paths = list(dict.fromkeys([p["path"] for p in seo.KNOWN_PAGES] + list(pages)))
    return {
        "global": g, "pages": pages, "updated_at": cfg["updated_at"],
        "known_pages": seo.KNOWN_PAGES, "changefreq": list(seo.CHANGEFREQ),
        "limits": {"title": list(seo.TITLE_RANGE), "description": list(seo.DESCRIPTION_RANGE)},
        "effective": {p: seo.effective(g, pages.get(p), p) for p in paths},
        "health": seo.health(cfg),
        "previews": {"robots_txt": seo.robots_txt(g), "sitemap_urls": seo.sitemap_urls(g, pages), "json_ld": seo.organization_json_ld(g)},
    }


@admin_router.get("")
def get_seo(db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    return _overview(db)


@admin_router.put("/global")
def put_global(request: Request, body: Dict[str, Any] = Body(...), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    try:
        clean = seo.clean_global(body)
    except seo.SeoError as e:
        raise _bad(e)
    seo.save(db, seo.GLOBAL_KEY, clean, admin.id)
    audit(db, "admin.seo_global_saved", admin, target_type="seo", target_id=seo.GLOBAL_KEY, ip=client_ip(request), meta={"index_site": clean["index_site"], "site_url": clean["site_url"]})
    return _overview(db)


@admin_router.put("/pages")
def put_page(request: Request, body: Dict[str, Any] = Body(...), db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    try:
        clean = seo.clean_page(body)
    except seo.SeoError as e:
        raise _bad(e)
    path = clean.pop("path")
    seo.save(db, seo.PAGE_PREFIX + path, clean, admin.id)
    audit(db, "admin.seo_page_saved", admin, target_type="seo_page", target_id=path, ip=client_ip(request), meta={"noindex": clean["noindex"]})
    return _overview(db)


@admin_router.delete("/pages")
def delete_page(path: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_platform_admin)) -> Dict[str, Any]:
    if not seo.delete_page(db, path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No override for that page")
    audit(db, "admin.seo_page_removed", admin, target_type="seo_page", target_id=path, ip=client_ip(request))
    return _overview(db)


@public_router.get("/public")
def public(response: Response, db: Session = Depends(get_db)) -> Dict[str, Any]:
    response.headers.update(CACHE)
    return seo.public_view(db)


@public_router.get("/robots.txt")
def robots(db: Session = Depends(get_db)) -> Response:
    return Response(content=seo.robots_txt(seo.load(db)["global"]), media_type="text/plain", headers=CACHE)


@public_router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)) -> Response:
    cfg = seo.load(db)
    return Response(content=seo.sitemap_xml(cfg["global"], cfg["pages"]), media_type="application/xml", headers=CACHE)
