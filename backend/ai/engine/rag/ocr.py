"""OCR for scanned PDF pages: each page with no selectable text is rendered (pypdfium2) and read by Tesseract.

Tesseract is a system binary (installed in infrastructure/docker/api.Dockerfile with the English, Hindi, Arabic, Dutch,
German, Spanish and French language packs). Without it, `available()` is False and a scanned PDF fails with a clear
message instead of being indexed empty. Pages are OCR'd one at a time with a per-page timeout and a page cap, inside the
background ingestion job, never in a request.

OCR can misread digits, so a document read this way carries a warning to check figures (fees, prices) against the
original."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from functools import lru_cache
from typing import Dict, Iterable

logger = logging.getLogger(__name__)

DEFAULT_LANGS = "eng+hin+ara+nld+deu+spa+fra"


def _settings():
    from backend.server.common.config import get_settings

    return get_settings()


def binary() -> str | None:
    return shutil.which("tesseract")


def available() -> bool:
    try:
        if (getattr(_settings(), "KB_OCR", "auto") or "auto").lower() == "off":
            return False
    except Exception:
        pass
    return binary() is not None


@lru_cache(maxsize=4)
def _installed(tesseract: str) -> frozenset:
    try:
        out = subprocess.run([tesseract, "--list-langs"], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return frozenset()
    return frozenset(line.strip() for line in out.splitlines()[1:] if line.strip() and line.strip() != "osd")


def languages() -> str:
    """The configured languages that are actually installed (Tesseract refuses an unknown pack), English at least."""
    wanted = (getattr(_settings(), "KB_OCR_LANGS", DEFAULT_LANGS) or DEFAULT_LANGS).split("+")
    have = _installed(binary() or "")
    chosen = [lang for lang in wanted if lang in have]
    return "+".join(chosen) if chosen else "eng"


def _pgm(array) -> bytes:
    """A grayscale bitmap as a binary PGM, which Tesseract reads directly (no image library needed)."""
    import numpy as np

    a = np.asarray(array)
    if a.ndim == 3:
        a = a[:, :, 0]
    h, w = a.shape
    return f"P5\n{w} {h}\n255\n".encode() + np.ascontiguousarray(a, dtype=np.uint8).tobytes()


def ocr_pages(pdf_bytes: bytes, pages: Iterable[int], dpi: int = 200, timeout: int = 60) -> Dict[int, str]:
    """{page number (1-based): text} for the requested pages. A page that fails or times out is left out."""
    import pypdfium2 as pdfium

    tesseract = binary()
    if not tesseract:
        return {}
    langs = languages()
    out: Dict[int, str] = {}
    doc = pdfium.PdfDocument(pdf_bytes)
    env = {**os.environ, "OMP_THREAD_LIMIT": "1"}  # one core per page: OCR must not starve live calls on the same host
    try:
        with tempfile.TemporaryDirectory(prefix="kb-ocr-") as tmp:
            for n in pages:
                try:
                    page = doc[n - 1]
                    bitmap = page.render(scale=dpi / 72.0, grayscale=True)
                    path = os.path.join(tmp, f"p{n}.pgm")
                    with open(path, "wb") as fh:
                        fh.write(_pgm(bitmap.to_numpy()))
                    page.close()
                    res = subprocess.run([tesseract, path, "stdout", "-l", langs, "--psm", "3"], capture_output=True, text=True,
                                         timeout=timeout, env=env)
                    if res.returncode == 0 and res.stdout.strip():
                        out[n] = res.stdout
                except subprocess.TimeoutExpired:
                    logger.warning("OCR timed out on page %d", n)
                except Exception as e:
                    logger.warning("OCR failed on page %d: %s", n, e)
    finally:
        doc.close()
    return out
