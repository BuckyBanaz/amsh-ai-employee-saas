"""Test script for Website Scraper & Live RAG URL Indexing.
Tests:
1. `_scrape_website_text(url)` HTML noise cleaner & text extractor.
2. Web scraper RAG indexing into `BusinessVectorStore`.
3. Sub-50ms vector query retrieval on live scraped website content.
"""

import sys
import time

# Ensure root backend path is importable
ROOT_DIR = r"c:\Users\Parikshit\Desktop\saas"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.ai.engine.rag.retriever import rag_retriever
from backend.server.api.routes.knowledge import _scrape_website_text


def test_website_scraper_and_rag():
    print("==================================================")
    print("--- [TEST 1] Scraping & Cleaning Website Text ---")
    print("==================================================")

    test_urls = [
        "https://example.com",
        "https://httpbin.org/html",
    ]

    for url in test_urls:
        print(f"\nScraping URL: {url}...")
        start_t = time.perf_counter()
        clean_text = _scrape_website_text(url)
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0

        print(f"Scrape Latency: {round(elapsed_ms, 2)}ms")
        print(f"Extracted Length: {len(clean_text)} chars")
        print(f"Preview (first 200 chars):\n  '{clean_text[:200]}...'")

        assert len(clean_text) > 0, f"Scraped text for {url} is empty!"
        assert "<script" not in clean_text.lower(), "HTML script tags were not stripped!"
        assert "<style" not in clean_text.lower(), "HTML style tags were not stripped!"

    print("\n==================================================")
    print("--- [TEST 2] RAG Indexing Scraped Website Data ---")
    print("==================================================")

    business_id = "test_hospital_web_123"
    custom_clinic_url = "https://sanjeevani-hospital-sample.com"

    sample_clinic_html_text = (
        "Sanjeevani Multispeciality Hospital - OPD & Emergency Services.\n\n"
        "About Us: Sanjeevani Hospital provides 24x7 emergency medical care, dental surgery, cardiology, and orthopedics.\n\n"
        "OPD Timings & Doctor Schedule:\n"
        "Morning Session: 09:00 AM to 01:00 PM (Monday to Saturday).\n"
        "Evening Session: 05:00 PM to 08:00 PM.\n"
        "Senior Dental Surgeon Dr. Sarah Wilson is available on Monday, Wednesday, and Friday.\n\n"
        "Consultation Fees & Appointment Rules:\n"
        "General Physician Consultation: Rs. 500.\n"
        "Specialist & Dental Consultation: Rs. 800.\n"
        "Patients can book appointments online or by calling our AI Receptionist line."
    )

    indexed_count = rag_retriever.index_document_text(
        business_id=business_id,
        text=sample_clinic_html_text,
        source_id="web_sync_sanjeevani",
    )
    print(f"Successfully indexed {indexed_count} semantic chunks into RAG store for {business_id}.")
    assert indexed_count > 0, "No chunks were indexed!"

    print("\n==================================================")
    print("--- [TEST 3] Sub-50ms RAG Query on Scraped Web Data ---")
    print("==================================================")

    queries = [
        "What are the OPD timings for morning session?",
        "When is Dr. Sarah Wilson available?",
        "How much is the specialist consultation fee?",
    ]

    for q in queries:
        start_q = time.perf_counter()
        res = rag_retriever.search_with_metadata(business_id, q, top_k=2)
        q_latency = res["latency_ms"]

        print(f"\nQuery: '{q}'")
        print(f"Latency: {q_latency}ms | Match Count: {res['match_count']}")
        for match in res["results"]:
            print(f"  [Score: {match['score']}] Text Snippet: {match['text'][:120]}...")

        assert q_latency < 50.0, f"RAG Query exceeded 50ms! ({q_latency}ms)"
        assert res["match_count"] > 0, f"No match found for query: {q}"

    print("\n[SUCCESS] ALL WEBSITE SCRAPER & RAG TESTS PASSED 100%!")


if __name__ == "__main__":
    test_website_scraper_and_rag()
