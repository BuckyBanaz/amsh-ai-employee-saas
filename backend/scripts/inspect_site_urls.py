"""Inspect Discovered URLs & Pages for `https://www.handmaesthetics.com/`."""

import re
import sys
import urllib.request

ROOT_DIR = r"c:\Users\Parikshit\Desktop\saas"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

TARGET_URL = "https://www.handmaesthetics.com/"

print(f"--- [DISCOVERY] Inspection of URLs for {TARGET_URL} ---")

req = urllib.request.Request(
    TARGET_URL,
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AMSh-AI-Crawler/1.0"}
)

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        # Extract internal links from anchor tags
        raw_links = re.findall(r'href=["\'](https?://www\.handmaesthetics\.com/[^"\']*)["\']', html, flags=re.IGNORECASE)
        relative_links = re.findall(r'href=["\'](/[^"\']*)["\']', html)

        all_urls = set()
        for link in raw_links:
            clean = link.rstrip("/")
            if clean:
                all_urls.add(clean)

        for rel in relative_links:
            if not rel.startswith(("//", "#", "javascript:")):
                all_urls.add(f"https://www.handmaesthetics.com{rel}".rstrip("/"))

        print(f"Total Unique Subpages / URLs Discovered: {len(all_urls)}")
        print("\nList of Discovered Pages:")
        for idx, u in enumerate(sorted(all_urls), 1):
            print(f"  {idx}. {u}")

except Exception as e:
    print(f"Error fetching URL: {e}")
