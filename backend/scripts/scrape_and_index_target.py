"""Deep Web Scraper & RAG Indexer for Live Interrogation.
Scrapes `https://texasfamilycare.com` main page + subpages, indexes into RAG store under business_id 'texas_clinic_live'.
"""

import sys
import time

ROOT_DIR = r"c:\Users\Parikshit\Desktop\saas"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.ai.engine.rag.retriever import rag_retriever
from backend.server.api.routes.knowledge import _scrape_website_text

TARGET_URL = "https://www.handmaesthetics.com/"
BUSINESS_ID = "handm_aesthetics_live"


def perform_full_scrape():
    print(f"--- [DEEP SCRAPE] Crawling {TARGET_URL} ---")
    start_t = time.perf_counter()

    full_text = _scrape_website_text(TARGET_URL)
    elapsed_sec = time.perf_counter() - start_t

    print(f"Scrape Complete in {round(elapsed_sec, 2)}s.")
    print(f"Total Text Size: {len(full_text)} characters.")

    print(f"\n--- [RAG INDEX] Splitting into Semantic Chunks for {BUSINESS_ID} ---")
    indexed_count = rag_retriever.index_document_text(
        business_id=BUSINESS_ID,
        text=full_text,
        source_id="texas_family_care_site",
    )

    print(f"Indexed {indexed_count} Chunks in RAG Vector Store!")
    print(f"Status: READY FOR LIVE QUERIES FOR BUSINESS '{BUSINESS_ID}'\n")


if __name__ == "__main__":
    perform_full_scrape()
