"""Website crawler for the knowledge base.

Starts from the business's URL, reads robots.txt and its sitemaps, and walks internal links breadth-first within a page and
depth limit. Each page's main content is kept (navigation, headers, footers, cookie banners and lines repeated on most
pages are dropped); tables, headings and lists keep their shape. Every URL ends up in exactly one bucket of the summary:
processed, failed (with the reason) or skipped (with the reason), so a crawl never reports success for pages it could not
read.

Safety: only http(s) on standard ports, and every request (redirects included) must resolve to a public address, so the
crawler cannot be pointed at the server's own network (SSRF). Responses are size-capped and time-limited."""

from __future__ import annotations

import ipaddress
import json
import logging
import re
import socket
import time
from collections import Counter, deque
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

logger = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (compatible; AMSh-KB-Crawler/2.0; +https://getamsh.com)"
ALLOWED_PORTS = {None, 80, 443, 8080, 8443}
MAX_PAGE_BYTES = 3 * 1024 * 1024
MAX_REDIRECTS = 5
NON_HTML_EXT = re.compile(r"\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|gz|mp4|mp3|mov|avi|docx?|xlsx?|pptx?|csv|css|js|json|xml|woff2?|ttf)$", re.I)
TRACKING_PARAMS = re.compile(r"^(utm_\w+|fbclid|gclid|msclkid|mc_cid|mc_eid|ref|_ga)$", re.I)


class CrawlError(Exception):
    """The crawl could not start (bad or unsafe URL). Shown to the business as-is."""


class FetchError(Exception):
    pass


@dataclass
class Response:
    url: str  # final URL after redirects
    status: int
    content_type: str
    body: bytes


Fetcher = Callable[[str], Response]


# ---------------------------------------------------------------------------------------------------------- URL safety

def normalize_url(url: str, base: Optional[str] = None) -> Optional[str]:
    """Absolute, canonical form used for de-duplication: lower-case host, no fragment, no default port, no tracking
    parameters, no trailing slash (except the root). None for anything that is not an http(s) URL."""
    url = (url or "").strip()
    if not url:
        return None
    if base:
        url = urljoin(base, url)
    elif not re.match(r"^[a-z][a-z0-9+.-]*://", url, re.I):
        url = "https://" + url
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if parts.scheme.lower() not in ("http", "https") or not parts.hostname:
        return None
    host = parts.hostname.lower().rstrip(".")
    try:
        port = parts.port
    except ValueError:
        return None
    netloc = host if port in (None, 80 if parts.scheme == "http" else 443) else f"{host}:{port}"
    if parts.username or parts.password:
        netloc = f"{parts.username or ''}{':' + parts.password if parts.password else ''}@{netloc}"
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if len(path) > 1:
        path = path.rstrip("/")
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not TRACKING_PARAMS.match(k)])
    return urlunsplit((parts.scheme.lower(), netloc, path, query, ""))


def check_url_safe(url: str, resolve: Callable = socket.getaddrinfo) -> None:
    """Raises CrawlError unless `url` is http(s), on a standard port, without credentials, and every address its host
    resolves to is public (no loopback, private, link-local/cloud-metadata, carrier-grade NAT or reserved ranges)."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise CrawlError("Only http:// and https:// website addresses can be synced.")
    if parts.username or parts.password:
        raise CrawlError("Website addresses with a username or password cannot be synced.")
    try:
        port = parts.port
    except ValueError:
        raise CrawlError("The website address has an invalid port.")
    if port not in ALLOWED_PORTS:
        raise CrawlError("Only websites on the standard ports (80, 443, 8080, 8443) can be synced.")
    host = (parts.hostname or "").rstrip(".")
    if not host:
        raise CrawlError("The website address has no host name.")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".lan")):
        raise CrawlError("Private or internal addresses cannot be synced.")
    try:
        infos = resolve(host, port or (443 if parts.scheme == "https" else 80), 0, socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise CrawlError(f"The website '{host}' could not be found. Check the address.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%", 1)[0])
        if getattr(ip, "ipv4_mapped", None):
            ip = ip.ipv4_mapped
        if not ip.is_global:
            raise CrawlError("Private or internal addresses cannot be synced.")


def safe_fetch(url: str, timeout: float = 10.0) -> Response:
    """GET with the safety check on the first request and on every redirect hop, and a body size cap."""
    import httpx

    current = url
    with httpx.Client(timeout=timeout, follow_redirects=False, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8"}) as client:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                check_url_safe(current)
            except CrawlError as e:
                raise FetchError(str(e))
            try:
                with client.stream("GET", current) as resp:
                    if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("location"):
                        # Follow the address exactly as given: normalize_url drops the trailing slash, so a site that
                        # redirects /page to /page/ would be sent back to /page until the redirect limit.
                        nxt = urljoin(current, resp.headers["location"]).split("#", 1)[0]
                        if urlsplit(nxt).scheme.lower() not in ("http", "https"):
                            raise FetchError("redirected to an unsupported address")
                        current = nxt
                        continue
                    body = bytearray()
                    for part in resp.iter_bytes():
                        body.extend(part)
                        if len(body) > MAX_PAGE_BYTES:
                            raise FetchError(f"page larger than {MAX_PAGE_BYTES // 1048576} MB")
                    return Response(str(resp.url), resp.status_code, resp.headers.get("content-type", ""), bytes(body))
            except httpx.TimeoutException:
                raise FetchError("timed out")
            except httpx.HTTPError as e:
                raise FetchError(f"could not connect ({type(e).__name__})")
    raise FetchError("too many redirects")


# ----------------------------------------------------------------------------------------------------- HTML extraction

_SKIP_TAGS = {"script", "style", "noscript", "svg", "template", "iframe", "nav", "header", "footer", "aside", "form",
              "button", "select", "dialog", "canvas"}
_SKIP_ROLES = {"navigation", "banner", "contentinfo", "search", "dialog", "alertdialog"}
_SKIP_CLASSES = {"nav", "navbar", "menu", "main-menu", "breadcrumb", "breadcrumbs", "cookie", "cookies", "cookie-banner",
                 "cookie-consent", "consent", "sidebar", "site-header", "site-footer", "skip-link", "social-share"}
_VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
_BLOCK = {"p", "div", "section", "article", "main", "li", "ul", "ol", "dl", "dt", "dd", "table", "tr", "thead", "tbody",
          "blockquote", "pre", "figure", "figcaption", "address", "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr"}


class _PageParser(HTMLParser):
    def __init__(self, relaxed: bool = False):
        super().__init__(convert_charrefs=True)
        self.relaxed = relaxed
        self.out: List[str] = []
        self.main_out: List[str] = []
        self.links: List[str] = []
        self.next_links: List[str] = []
        self.title = ""
        self.meta: Dict[str, str] = {}
        self.canonical = ""
        self.jsonld: List[str] = []
        self._skip: List[str] = []
        self._in_title = False
        self._in_jsonld = False
        self._jsonld_buf: List[str] = []
        self._main_depth = 0
        self._stack: List[str] = []

    def _emit(self, s: str):
        self.out.append(s)
        if self._main_depth:
            self.main_out.append(s)

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
            if "next" in a.get("rel", "").lower().split():
                self.next_links.append(a["href"])
        if tag == "link":
            rel = a.get("rel", "").lower().split()
            if "canonical" in rel:
                self.canonical = a.get("href", "")
            if "next" in rel and a.get("href"):
                self.next_links.append(a["href"])
        if tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key in ("description", "og:description", "robots", "keywords") and a.get("content"):
                self.meta[key] = a["content"]
        if tag == "title":
            self._in_title = True
        if tag == "script" and "ld+json" in a.get("type", "").lower():
            self._in_jsonld = True
            self._jsonld_buf = []
        if tag in _VOID:
            if tag in ("br", "hr") and not self._skip:
                self._emit("\n")
            return
        self._stack.append(tag)
        classes = set(a.get("class", "").lower().split()) | {a.get("id", "").lower()}
        skip = tag in _SKIP_TAGS if not self.relaxed else tag in ("script", "style", "noscript", "svg", "template")
        if not self.relaxed and (a.get("role", "").lower() in _SKIP_ROLES or classes & _SKIP_CLASSES or a.get("aria-hidden") == "true"):
            skip = True
        if skip or self._skip:
            self._skip.append(tag)
            return
        if tag in ("main", "article") or a.get("role", "").lower() == "main":
            self._main_depth += 1
        if tag in _BLOCK:
            self._emit("\n")
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._emit("## ")
        elif tag == "li":
            self._emit("- ")
        elif tag in ("td", "th"):
            self._emit(" | ")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag == "script" and self._in_jsonld:
            self._in_jsonld = False
            self.jsonld.append("".join(self._jsonld_buf))
        if tag in _VOID:
            return
        if self._skip:
            # close the innermost open element with this name (tolerates a few unclosed tags inside)
            if tag in self._skip:
                while self._skip and self._skip.pop() != tag:
                    pass
            if tag in self._stack:
                while self._stack and self._stack.pop() != tag:
                    pass
            return
        if tag in self._stack:
            while self._stack and self._stack.pop() != tag:
                pass
        if (tag in ("main", "article")) and self._main_depth:
            self._main_depth -= 1
        if tag in _BLOCK:
            self._emit("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_jsonld:
            self._jsonld_buf.append(data)
            return
        if self._skip:
            return
        self._emit(data)


def _tidy(parts: List[str]) -> str:
    text = "".join(parts)
    lines = []
    for line in text.split("\n"):
        line = re.sub(r"\s+", " ", line).strip(" |")
        line = line.strip()
        if line in ("##", "-", ""):
            if lines and lines[-1] != "":
                lines.append("")
            continue
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _jsonld_text(blocks: List[str]) -> str:
    """Facts from schema.org JSON-LD: FAQs, the organisation's contact details and hours, offers and prices."""
    keep = ("name", "description", "telephone", "email", "openingHours", "priceRange", "price", "priceCurrency", "jobTitle",
            "streetAddress", "addressLocality", "postalCode", "addressCountry")
    lines: List[str] = []

    def walk(node, depth=0):
        if depth > 6 or len(lines) > 200:
            return
        if isinstance(node, list):
            for n in node:
                walk(n, depth + 1)
            return
        if not isinstance(node, dict):
            return
        kind = node.get("@type")
        kind = kind[0] if isinstance(kind, list) and kind else kind
        if kind == "FAQPage":
            for q in node.get("mainEntity") or []:
                if isinstance(q, dict):
                    ans = q.get("acceptedAnswer") or {}
                    a_text = ans.get("text") if isinstance(ans, dict) else ""
                    if q.get("name") and a_text:
                        lines.append(f"Q: {_strip_tags(q['name'])}\nA: {_strip_tags(a_text)}")
            return
        facts = [f"{k}: {_strip_tags(str(node[k]))}" for k in keep if isinstance(node.get(k), (str, int, float)) and str(node[k]).strip()]
        if isinstance(node.get("openingHours"), list):
            facts.append("openingHours: " + ", ".join(map(str, node["openingHours"])))
        if facts and kind not in ("WebSite", "WebPage", "BreadcrumbList", "ImageObject", "SearchAction", "ListItem"):
            lines.append((f"{kind}: " if isinstance(kind, str) else "") + "; ".join(facts))
        for k, v in node.items():
            if isinstance(v, (dict, list)) and k not in ("potentialAction", "breadcrumb", "image", "logo"):
                walk(v, depth + 1)

    for raw in blocks:
        try:
            walk(json.loads(raw.strip()))
        except Exception:
            continue
    return "\n".join(dict.fromkeys(lines))


def _strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


@dataclass
class ParsedPage:
    title: str
    text: str
    links: List[str]
    next_links: List[str]
    canonical: str
    noindex: bool
    needs_js: bool


def parse_html(html: str) -> ParsedPage:
    p = _PageParser()
    try:
        p.feed(html)
        p.close()
    except Exception:
        pass
    body = _tidy(p.main_out) if len(_tidy(p.main_out)) > 200 else _tidy(p.out)
    if len(body) < 200:
        relaxed = _PageParser(relaxed=True)  # malformed markup can hide everything inside an unclosed <nav>: retry gently
        try:
            relaxed.feed(html)
            relaxed.close()
            alt = _tidy(relaxed.out)
            if len(alt) > len(body) * 3 and len(alt) > 400:
                body = alt
        except Exception:
            pass
    extra = []
    desc = p.meta.get("description") or p.meta.get("og:description")
    if desc and desc not in body:
        extra.append(desc.strip())
    ld = _jsonld_text(p.jsonld)
    if ld:
        extra.append(ld)
    text = "\n\n".join(x for x in [body] + extra if x)
    needs_js = len(body) < 150 and bool(re.search(r'id=["\'](root|__next|app|__nuxt)["\']', html)) and html.count("<script") >= 2
    return ParsedPage(
        title=_strip_tags(p.title),
        text=text,
        links=p.links,
        next_links=p.next_links,
        canonical=p.canonical,
        noindex="noindex" in p.meta.get("robots", "").lower(),
        needs_js=needs_js,
    )


def _decode_html(body: bytes, content_type: str) -> str:
    m = re.search(r"charset=([\w-]+)", content_type or "", re.I) or re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', body[:2048], re.I)
    enc = m.group(1) if m else "utf-8"
    enc = enc.decode() if isinstance(enc, bytes) else enc
    try:
        return body.decode(enc, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


# ------------------------------------------------------------------------------------------------------------------ crawl

@dataclass
class Page:
    url: str
    title: str
    text: str


@dataclass
class CrawlResult:
    pages: List[Page] = field(default_factory=list)
    discovered: int = 0
    failed: List[Dict[str, str]] = field(default_factory=list)
    skipped: List[Dict[str, str]] = field(default_factory=list)
    sitemap_urls: int = 0
    robots: str = "none"  # none | allowed | restricted

    def summary(self) -> dict:
        return {
            "urls_discovered": self.discovered,
            "urls_processed": len(self.pages),
            "urls_failed": len(self.failed),
            "urls_skipped": len(self.skipped),
            "chars_indexed": sum(len(p.text) for p in self.pages),
            "sitemap_urls": self.sitemap_urls,
            "robots_txt": self.robots,
            "processed": [p.url for p in self.pages][:200],
            "failed": self.failed[:100],
            "skipped": self.skipped[:100],
        }


def _same_site(url: str, root_host: str) -> bool:
    host = (urlsplit(url).hostname or "").lower()
    strip = lambda h: h[4:] if h.startswith("www.") else h  # noqa: E731
    return strip(host) == strip(root_host)


def _sitemap_urls(fetch: Fetcher, sitemaps: List[str], root_host: str, limit: int = 500) -> List[str]:
    found: List[str] = []
    queue = deque(sitemaps[:5])
    seen = set()
    while queue and len(seen) < 6 and len(found) < limit:
        sm = queue.popleft()
        if sm in seen:
            continue
        seen.add(sm)
        try:
            resp = fetch(sm)
        except FetchError:
            continue
        if resp.status != 200:
            continue
        xml = resp.body.decode("utf-8", errors="ignore")
        locs = [l.strip() for l in re.findall(r"<loc>\s*(.*?)\s*</loc>", xml, re.I | re.S)]
        if re.search(r"<sitemapindex", xml, re.I):
            queue.extend(normalize_url(l) for l in locs if normalize_url(l))
            continue
        for loc in locs:
            u = normalize_url(loc)
            if u and _same_site(u, root_host):
                found.append(u)
    return list(dict.fromkeys(found))[:limit]


_PAGE_PARAM = re.compile(r"(^|&)(page|p|pg|paged|start|offset)=\d+", re.I)


def _is_pagination(href: str, base: str) -> bool:
    """A link to another page of the same listing: same path with ?page=N, or /page/N under the same path."""
    u = normalize_url(href, base)
    if not u:
        return False
    a, b = urlsplit(u), urlsplit(base)
    if a.netloc != b.netloc:
        return False
    if a.path == b.path and _PAGE_PARAM.search(a.query or ""):
        return True
    m = re.match(r"^(.*?)/page/\d+$", a.path)
    return bool(m) and (m.group(1) or "/").rstrip("/") == re.sub(r"/page/\d+$", "", b.path).rstrip("/")


def _drop_boilerplate(pages: List[Page]) -> None:
    """Lines that repeat on most pages (menus, footers, contact strips the markup did not mark up) are not content."""
    if len(pages) < 3:
        return
    counts = Counter()
    for p in pages:
        counts.update(set(l for l in p.text.split("\n") if l.strip()))
    limit = max(3, int(len(pages) * 0.6))
    common = {l for l, n in counts.items() if n >= limit}
    if not common:
        return
    for p in pages:
        kept = [l for l in p.text.split("\n") if l not in common]
        p.text = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()


def crawl(start_url: str, max_pages: int = 25, max_depth: int = 2, fetcher: Optional[Fetcher] = None,
          time_budget_s: float = 120.0) -> CrawlResult:
    fetch = fetcher or safe_fetch
    start = normalize_url(start_url)
    if not start:
        raise CrawlError("Enter a valid website address, like https://example.com.")
    if fetcher is None:
        check_url_safe(start)
    root = urlsplit(start)
    root_host = (root.hostname or "").lower()
    origin = f"{root.scheme}://{root.netloc.split('@')[-1]}"
    result = CrawlResult()
    deadline = time.monotonic() + time_budget_s

    robots = RobotFileParser()
    robots_ok = False
    delay = 0.0
    sitemaps: List[str] = []
    try:
        r = fetch(origin + "/robots.txt")
        if r.status == 200 and "html" not in r.content_type.lower():
            lines = r.body.decode("utf-8", errors="ignore").splitlines()
            robots.parse(lines)
            robots_ok = True
            result.robots = "allowed"
            sitemaps = [normalize_url(l.split(":", 1)[1].strip()) for l in lines if l.lower().startswith("sitemap:")]
            sitemaps = [s for s in sitemaps if s]
            delay = min(float(robots.crawl_delay(USER_AGENT) or 0), 2.0)
    except FetchError:
        pass
    except Exception:  # an unreadable robots.txt: treat as no robots.txt
        pass
    if origin + "/sitemap.xml" not in sitemaps:
        sitemaps.append(origin + "/sitemap.xml")
    sm_urls = _sitemap_urls(fetch, sitemaps, root_host)
    result.sitemap_urls = len(sm_urls)

    queue: deque[Tuple[str, int]] = deque([(start, 0)])
    queue.extend((u, 1) for u in sm_urls if u != start)
    queued = {start} | set(sm_urls)
    seen_text: set = set()
    seen: set = set()

    def allowed(url: str) -> bool:
        return not robots_ok or robots.can_fetch(USER_AGENT, url)

    while queue:
        url, depth = queue.popleft()
        if url in seen:
            continue
        seen.add(url)
        if len(result.pages) >= max_pages:
            result.skipped.append({"url": url, "reason": f"page limit ({max_pages}) reached"})
            continue
        if time.monotonic() > deadline:
            result.skipped.append({"url": url, "reason": "time limit reached"})
            continue
        if NON_HTML_EXT.search(urlsplit(url).path):
            result.skipped.append({"url": url, "reason": "not a web page (file link)"})
            continue
        if not allowed(url):
            if robots_ok and url == start:
                result.robots = "restricted"
            result.skipped.append({"url": url, "reason": "blocked by robots.txt"})
            continue
        if delay and result.pages:
            time.sleep(delay)
        try:
            resp = fetch(url)
        except FetchError as e:
            result.failed.append({"url": url, "reason": str(e)})
            continue
        if resp.status >= 400:
            result.failed.append({"url": url, "reason": f"HTTP {resp.status}"})
            continue
        final = normalize_url(resp.url) or url
        if final != url:
            if not _same_site(final, root_host):
                result.skipped.append({"url": url, "reason": "redirects to another site"})
                continue
            if final in seen:
                result.skipped.append({"url": url, "reason": "duplicate (redirect)"})
                continue
            seen.add(final)
        ctype = resp.content_type.lower()
        if ctype and "html" not in ctype and "text/plain" not in ctype:
            result.skipped.append({"url": url, "reason": f"not a web page ({ctype.split(';')[0]})"})
            continue
        html = _decode_html(resp.body, resp.content_type)
        if "text/plain" in ctype:
            page = ParsedPage(title="", text=html.strip(), links=[], next_links=[], canonical="", noindex=False, needs_js=False)
        else:
            page = parse_html(html)
        if page.noindex:
            result.skipped.append({"url": url, "reason": "page asks not to be indexed (noindex)"})
        elif page.needs_js and len(page.text) < 150:
            result.skipped.append({"url": url, "reason": "content needs JavaScript to display (not rendered)"})
        else:
            canonical = normalize_url(page.canonical, final) if page.canonical else None
            digest = hash(page.text)
            if canonical and canonical != final and canonical in seen and _same_site(canonical, root_host):
                result.skipped.append({"url": url, "reason": "duplicate of " + canonical})
            elif digest in seen_text or len(page.text) < 40:
                result.skipped.append({"url": url, "reason": "duplicate content" if digest in seen_text else "no readable content"})
            else:
                seen_text.add(digest)
                result.pages.append(Page(url=final, title=page.title, text=page.text))
        for href in page.next_links + [l for l in page.links if _is_pagination(l, final)]:
            u = normalize_url(href, final)  # pagination continues the same listing: it does not count as a level deeper
            if u and u not in queued and _same_site(u, root_host):
                queued.add(u)
                queue.appendleft((u, depth))
        if depth < max_depth:
            for href in page.next_links:  # pagination first
                u = normalize_url(href, final)
                if u and u not in queued and _same_site(u, root_host):
                    queued.add(u)
                    queue.appendleft((u, depth + 1))
            for href in page.links:
                if href.startswith(("mailto:", "tel:", "javascript:", "#")):
                    continue
                u = normalize_url(href, final)
                if u and u not in queued and _same_site(u, root_host):
                    queued.add(u)
                    queue.append((u, depth + 1))
    result.discovered = len(queued | seen)
    _drop_boilerplate(result.pages)
    for p in [p for p in result.pages if len(p.text) < 40]:
        result.skipped.append({"url": p.url, "reason": "only content repeated on every page"})
    result.pages = [p for p in result.pages if len(p.text) >= 40]
    return result
