"""SEO settings (admin portal) and the public endpoints the marketing site and crawlers read."""

import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.ai.evals.fixtures import make_db_factory
from backend.server.api.routes import seo as routes
from backend.server.auth.security import create_access_token
from backend.server.database.models.user import User
from backend.server.database.session import get_db
from backend.server.services import seo as svc

OK = {"site_name": "AMSh", "site_url": "https://amsh.ai/", "title_template": "%s | AMSh", "default_title": "AMSh: AI receptionist for clinics",
      "default_description": "AMSh answers your clinic's calls and WhatsApp messages in Hindi, Hinglish and English and books appointments for you.",
      "default_og_image": "https://amsh.ai/og.png", "twitter_handle": "amsh_ai", "locale": "en_IN", "index_site": True,
      "analytics": {"ga4_id": "G-ABC1234567", "gtm_id": ""}, "organization": {"name": "AMSh", "logo_url": "https://amsh.ai/logo.png", "same_as": ["https://x.com/amsh_ai"]}}


class SeoApi(unittest.TestCase):
    def setUp(self):
        factory, self.biz = make_db_factory()
        with factory() as db:
            admin = User(email="a@amsh.ai", hashed_password="x", name="Admin", scope="platform", role="admin")
            owner = User(email="o@c.com", hashed_password="x", name="Owner", business_id=self.biz, role="owner")
            db.add_all([admin, owner])
            db.commit()
            self.h = {"admin": {"Authorization": f"Bearer {create_access_token(admin.id)}"}, "owner": {"Authorization": f"Bearer {create_access_token(owner.id)}"}}
        app = FastAPI()
        app.include_router(routes.admin_router)
        app.include_router(routes.public_router)

        def override():
            with factory() as db:
                yield db

        app.dependency_overrides[get_db] = override
        self.c = TestClient(app)

    def test_admin_endpoints_need_a_platform_admin(self):
        self.assertEqual(self.c.get("/api/admin/seo").status_code, 401)
        self.assertEqual(self.c.get("/api/admin/seo", headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.put("/api/admin/seo/global", json=OK, headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.put("/api/admin/seo/pages", json={"path": "/x"}, headers=self.h["owner"]).status_code, 403)
        self.assertEqual(self.c.delete("/api/admin/seo/pages?path=/x", headers=self.h["owner"]).status_code, 403)

    def test_fresh_install_reports_what_is_missing(self):
        body = self.c.get("/api/admin/seo", headers=self.h["admin"]).json()
        messages = " ".join(i["message"] for i in body["health"]["issues"])
        self.assertIn("Site URL is not set", messages)
        self.assertIn("social sharing image", messages)
        self.assertLess(body["health"]["score"], 100)
        self.assertEqual(body["previews"]["sitemap_urls"], [])  # no site URL, so no absolute URLs
        self.assertIn("Disallow: /dashboard", body["previews"]["robots_txt"])

    def test_saving_site_defaults_cleans_and_drives_the_public_files(self):
        r = self.c.put("/api/admin/seo/global", json=OK, headers=self.h["admin"])
        self.assertEqual(r.status_code, 200)
        g = r.json()["global"]
        self.assertEqual((g["site_url"], g["twitter_handle"]), ("https://amsh.ai", "@amsh_ai"))  # trailing slash and @ normalised
        robots = self.c.get("/api/seo/robots.txt")
        self.assertEqual(robots.headers["content-type"].split(";")[0], "text/plain")
        self.assertIn("Sitemap: https://amsh.ai/sitemap.xml", robots.text)
        self.assertIn("Disallow: /dashboard", robots.text)
        sitemap = self.c.get("/api/seo/sitemap.xml").text
        self.assertIn("<loc>https://amsh.ai/landing</loc>", sitemap)
        self.assertNotIn("/login", sitemap)  # sign-in is not indexable by default
        public = self.c.get("/api/seo/public").json()
        self.assertEqual(public["analytics"]["ga4_id"], "G-ABC1234567")
        self.assertEqual(public["json_ld"]["@type"], "Organization")
        self.assertEqual(public["pages"]["/landing"]["canonical"], "https://amsh.ai/landing")
        self.assertEqual(self.c.get("/api/seo/public").headers["cache-control"], "public, max-age=300")

    def test_hiding_the_site_blocks_everything(self):
        self.c.put("/api/admin/seo/global", json={**OK, "index_site": False}, headers=self.h["admin"])
        self.assertIn("Disallow: /\n", self.c.get("/api/seo/robots.txt").text)
        self.assertNotIn("<url>", self.c.get("/api/seo/sitemap.xml").text)
        self.assertTrue(self.c.get("/api/seo/public").json()["pages"]["/landing"]["noindex"])
        errors = [i for i in self.c.get("/api/admin/seo", headers=self.h["admin"]).json()["health"]["issues"] if i["level"] == "error"]
        self.assertTrue(errors)

    def test_global_validation(self):
        bad = [{"site_url": "amsh.ai"}, {"title_template": "no placeholder"}, {"default_title": "<script>"}, {"twitter_handle": "not a handle!"},
               {"locale": "english"}, {"analytics": {"ga4_id": "UA-1"}}, {"analytics": {"gtm_id": "x"}}, {"default_og_image": "javascript:alert(1)"},
               {"disallow_paths": ["dashboard"]}, {"organization": {"same_as": ["notaurl"]}}, {"verification": {"google": "a b"}}]
        for patch in bad:
            r = self.c.put("/api/admin/seo/global", json={**OK, **patch}, headers=self.h["admin"])
            self.assertEqual(r.status_code, 400, patch)

    def test_page_overrides_flow_into_effective_values_sitemap_and_checks(self):
        self.c.put("/api/admin/seo/global", json=OK, headers=self.h["admin"])
        page = {"path": "/landing", "title": "AI receptionist for clinics in India", "description": "Never miss a patient call again. AMSh books appointments in Hindi, Hinglish and English, day and night.", "changefreq": "weekly", "priority": 1}
        r = self.c.put("/api/admin/seo/pages", json=page, headers=self.h["admin"])
        self.assertEqual(r.status_code, 200)
        eff = r.json()["effective"]["/landing"]
        self.assertEqual(eff["full_title"], "AI receptionist for clinics in India | AMSh")
        self.assertIn("<priority>1.0</priority>", self.c.get("/api/seo/sitemap.xml").text)
        self.c.put("/api/admin/seo/pages", json={"path": "/landing", "noindex": True}, headers=self.h["admin"])
        self.assertNotIn("/landing<", self.c.get("/api/seo/sitemap.xml").text)
        warnings = [i["message"] for i in self.c.get("/api/admin/seo", headers=self.h["admin"]).json()["health"]["issues"] if i["where"] == "/landing"]
        self.assertTrue(any("noindex" in w for w in warnings))
        removed = self.c.delete("/api/admin/seo/pages?path=/landing", headers=self.h["admin"])
        self.assertEqual(removed.status_code, 200)
        self.assertNotIn("/landing", removed.json()["pages"])
        self.assertEqual(self.c.delete("/api/admin/seo/pages?path=/landing", headers=self.h["admin"]).status_code, 404)

    def test_page_validation(self):
        for patch in ({"path": "landing"}, {"path": "/a b"}, {"path": "/x", "title": "<b>"}, {"path": "/x", "canonical": "ftp://x"},
                      {"path": "/x", "changefreq": "sometimes"}, {"path": "/x", "priority": 2}, {"path": "/x", "priority": "high"}, {"path": "/x", "og_image": "x"}):
            self.assertEqual(self.c.put("/api/admin/seo/pages", json=patch, headers=self.h["admin"]).status_code, 400, patch)

    def test_custom_pages_join_the_sitemap_and_duplicates_are_flagged(self):
        self.c.put("/api/admin/seo/global", json=OK, headers=self.h["admin"])
        self.c.put("/api/admin/seo/pages", json={"path": "/pricing", "title": "Pricing for clinics and hospitals", "description": OK["default_description"]}, headers=self.h["admin"])
        self.assertIn("https://amsh.ai/pricing", self.c.get("/api/seo/sitemap.xml").text)
        issues = [i["message"] for i in self.c.get("/api/admin/seo", headers=self.h["admin"]).json()["health"]["issues"]]
        self.assertTrue(any("Same description" in m for m in issues))  # /pricing reuses the default description that /landing inherits

    def test_sitemap_escapes_and_is_well_formed(self):
        import xml.etree.ElementTree as ET

        self.c.put("/api/admin/seo/global", json=OK, headers=self.h["admin"])
        ET.fromstring(self.c.get("/api/seo/sitemap.xml").text)  # parses


class SeoService(unittest.TestCase):
    def test_title_length_check_and_score(self):
        cfg = {"global": {**svc.DEFAULT_GLOBAL, "site_url": "https://amsh.ai", "default_og_image": "https://x/y.png", "default_title": "Hi"}, "pages": {}}
        issues = svc.health(cfg)["issues"]
        self.assertTrue(any("Title is" in i["message"] for i in issues))

    def test_json_ld_needs_site_url(self):
        self.assertIsNone(svc.organization_json_ld(svc.DEFAULT_GLOBAL))


if __name__ == "__main__":
    unittest.main()


class SignInStaysOutOfSearch(unittest.TestCase):
    def test_login_is_noindex_unless_an_admin_opts_in(self):
        g = {**svc.DEFAULT_GLOBAL, "site_url": "https://amsh.ai"}
        self.assertTrue(svc.effective(g, None, "/login")["noindex"])
        self.assertFalse(svc.effective(g, None, "/landing")["noindex"])
        self.assertFalse(svc.effective(g, {"noindex": False}, "/login")["noindex"])
        self.assertNotIn("/login", " ".join(u["loc"] for u in svc.sitemap_urls(g, {})))
        self.assertIn("/login", " ".join(u["loc"] for u in svc.sitemap_urls(g, {"/login": {"noindex": False}})))
