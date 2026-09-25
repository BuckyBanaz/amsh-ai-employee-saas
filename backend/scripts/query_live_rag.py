import sys
import time

ROOT_DIR = r"c:\Users\Parikshit\Desktop\saas"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.ai.engine.rag.retriever import rag_retriever
from backend.server.api.routes.knowledge import _scrape_website_text

query = sys.argv[1] if len(sys.argv) > 1 else "What services and medical care do you offer?"

# Scrape H&M Aesthetics website and subpages
full_text = _scrape_website_text("https://www.handmaesthetics.com/")
rag_retriever.index_document_text("handm_aesthetics_live", full_text)

start_t = time.perf_counter()
res = rag_retriever.search_with_metadata("handm_aesthetics_live", query, top_k=3)
elapsed_ms = res["latency_ms"]

print(f"=== RAG SEARCH RESULT ===")
print(f"Query: '{query}'")
print(f"RAG Latency: {elapsed_ms} ms")
print(f"Matches Found: {res['match_count']}\n")

for i, r in enumerate(res["results"]):
    print(f"--- [Snippet {i+1} | Match Score: {r['score']}] ---")
    print(r["text"].strip())
    print()
