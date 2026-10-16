"""Services on the business's own website that are missing from its Services list (dashboard suggestions).

Live call CA7bb473994c: the agent read "gum care, implants, smile designing" from the crawled website, the caller chose
Gum Care, and the booking was refused because only three services were in the list."""

import asyncio
import json
import unittest

from backend.ai.evals.fixtures import make_db_factory
from backend.server.database.models.knowledge_base import KnowledgeDocument
from backend.server.services import service_suggestions as S

SITE = ("Dr. Vinita Jain, periodontist in Hisar. We specialise in dental implants, specialised gum care and esthetic smile "
        "designing. We also offer root canal treatment and dental cleaning. Clinic open 10 am to 7 pm.")


class FakeLLM:
    def __init__(self, services):
        self.calls = 0
        self.services = services

    async def chat(self, messages, tools):
        self.calls += 1
        return {"content": json.dumps({"services": self.services}), "tool_calls": []}


def item(title, quote, description=""):
    return {"title": title, "quote": quote, "description": description}


class Grounding(unittest.TestCase):
    def test_only_services_quoted_from_the_website_survive(self):
        found = S.ground([item("Dental Implants", "dental implants"), item("Laser Surgery", "laser surgery for gums")], SITE)
        self.assertEqual([f["title"] for f in found], ["Dental Implants"])  # never on the site: dropped

    def test_quotes_match_in_any_script_and_case(self):
        text = "हम दाँतों की सफ़ाई और इम्प्लांट करते हैं।"
        self.assertEqual(len(S.ground([item("इम्प्लांट", "सफ़ाई और इम्प्लांट")], text)), 1)
        self.assertEqual(len(S.ground([item("Implants", "DENTAL   IMPLANTS")], SITE)), 1)

    def test_duplicates_are_merged(self):
        self.assertEqual(len(S.ground([item("Dental Implants", "dental implants"), item("dental implants", "dental implants")], SITE)), 1)

    def test_services_already_listed_are_not_suggested(self):
        found = [{"title": "Root Canal Treatment (RCT)"}, {"title": "Dental cleaning"}, {"title": "Dental Implants"}]
        self.assertEqual([f["title"] for f in S.missing_from(["Root Canal Treatment", "Dental Cleaning"], found)], ["Dental Implants"])


class Suggestions(unittest.TestCase):
    def setUp(self):
        S._CACHE.clear()
        self.factory, self.biz = make_db_factory()
        db = self.factory()
        db.add(KnowledgeDocument(business_id=self.biz, doc_type="website", status="indexed", source_url="https://clinic.example/", answer=SITE))
        db.commit()
        db.close()

    def _run(self, llm):
        db = self.factory()
        try:
            return asyncio.run(S.suggestions_for(self.biz, db, backend=llm))
        finally:
            db.close()

    def test_missing_grounded_services_are_suggested_with_their_source(self):
        llm = FakeLLM([item("Dental Implants", "dental implants"), item("Gum Care", "specialised gum care"),
                       item("Root Canal Treatment", "root canal treatment"), item("Whitening", "teeth whitening")])
        out = self._run(llm)
        self.assertEqual([s["title"] for s in out["suggestions"]], ["Dental Implants", "Gum Care"])
        self.assertEqual({s["source_url"] for s in out["suggestions"]}, {"https://clinic.example/"})
        self.assertIsNone(out["error"])

    def test_the_website_is_read_once_and_the_list_rechecked_each_time(self):
        llm = FakeLLM([item("Dental Implants", "dental implants")])
        self.assertEqual(len(self._run(llm)["suggestions"]), 1)
        db = self.factory()
        from backend.server.database.models.service import Service
        db.add(Service(business_id=self.biz, title="Dental Implants", duration_minutes=60))
        db.commit()
        db.close()
        self.assertEqual(self._run(llm)["suggestions"], [])  # added by the owner: no longer suggested
        self.assertEqual(llm.calls, 1)

    def test_a_failing_llm_never_breaks_the_page(self):
        class Down:
            async def chat(self, messages, tools):
                raise RuntimeError("provider down")
        out = self._run(Down())
        self.assertEqual((out["suggestions"], out["error"]), ([], "unavailable"))

    def test_a_cut_off_reply_gives_no_suggestions_rather_than_garbage(self):
        class Cut:
            async def chat(self, messages, tools):
                return {"content": '{"services": [{"title": "Dental Implants", "quote": "dental impl', "tool_calls": []}
        self.assertEqual(self._run(Cut())["suggestions"], [])


if __name__ == "__main__":
    unittest.main()
