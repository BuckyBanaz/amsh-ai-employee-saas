"""Text and table extraction for knowledge-base uploads: PDF, DOC, DOCX, TXT, CSV, XLS and XLSX.

Every extractor returns an `Extracted`: text sections (with where they came from: page, heading) and tables (header + rows,
with the sheet or table name). Tables are kept as rows and columns so a fee sheet can be looked up exactly
(backend/ai/engine/rag/structured.py) instead of only by text similarity.

The file type is decided from the file's own bytes, not just its name: a renamed executable, a zip bomb or a damaged file is
refused with a message the business can act on (`ExtractionError`)."""

from __future__ import annotations

import csv
import io
import re
import struct
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Iterable, List, Optional
from xml.etree import ElementTree as ET

SUPPORTED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".csv", ".xls", ".xlsx"}

MIME_TYPES = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "csv": "text/csv",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


@dataclass
class Limits:
    max_bytes: int = 20 * 1024 * 1024
    max_chars: int = 3_000_000  # extracted text cap: a 20 MB file never becomes a gigabyte of chunks
    max_rows: int = 50_000  # per table
    max_pages: int = 2_000
    max_unzipped_bytes: int = 250 * 1024 * 1024  # DOCX/XLSX are zips: refuse zip bombs before opening them
    max_zip_ratio: int = 200
    ocr: bool = True  # read scanned PDF pages with Tesseract when it is installed (backend/ai/engine/rag/ocr.py)
    ocr_max_pages: int = 50
    ocr_dpi: int = 200


@dataclass
class Section:
    text: str
    meta: dict = field(default_factory=dict)  # {"page": 3} | {"heading": "Fees"}


@dataclass
class Table:
    name: str  # sheet name, "Table 2", or the CSV's file name
    header: List[str]
    rows: List[List[str]]
    caption: str = ""  # title rows above the header ("Fee Structure 2026-27")


@dataclass
class Extracted:
    kind: str
    sections: List[Section] = field(default_factory=list)
    tables: List[Table] = field(default_factory=list)
    meta: dict = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)

    def char_count(self) -> int:
        return sum(len(s.text) for s in self.sections) + sum(len(" ".join(r)) for t in self.tables for r in t.rows)


class ExtractionError(Exception):
    """A file that cannot be indexed. The message is shown to the business as-is."""


def extension(filename: str) -> str:
    m = re.search(r"(\.[A-Za-z0-9]+)$", filename or "")
    return m.group(1).lower() if m else ""


def detect_kind(filename: str, data: bytes) -> str:
    """The file's real type, checked against its extension. Raises ExtractionError when they disagree or the type is not
    supported, so a .exe renamed to .pdf, or a PDF renamed to .xlsx, is refused instead of being indexed as noise."""
    ext = extension(filename)
    if ext not in SUPPORTED_EXTENSIONS:
        raise ExtractionError(f"Unsupported file type '{ext or 'none'}'. Upload a PDF, DOC, DOCX, TXT, CSV, XLS or XLSX file.")
    if not data:
        raise ExtractionError("The file is empty.")
    head = data[:8]
    if ext == ".pdf":
        if b"%PDF-" not in data[:1024]:
            raise ExtractionError("This file is not a valid PDF (it may be damaged or renamed).")
        return "pdf"
    if ext in (".docx", ".xlsx"):
        if not head.startswith(b"PK"):
            if head == OLE_MAGIC:
                raise ExtractionError(f"This file is an older Office format saved with a {ext} name. Save it as {ext} again, or upload it as {'.doc' if ext == '.docx' else '.xls'}.")
            raise ExtractionError(f"This file is not a valid {ext.upper()[1:]} file (it may be damaged or renamed).")
        return ext[1:]
    if ext in (".doc", ".xls"):
        if head != OLE_MAGIC:
            if head.startswith(b"PK"):
                return "docx" if ext == ".doc" else "xlsx"  # a modern file saved with the old extension: read it as what it is
            raise ExtractionError(f"This file is not a valid {ext.upper()[1:]} file (it may be damaged or renamed).")
        return ext[1:]
    # .txt / .csv: text, never binary
    if head.startswith((b"%PDF", b"PK\x03\x04", OLE_MAGIC[:4], b"MZ", b"\x7fELF")):
        raise ExtractionError(f"This file is not plain text, although it is named {ext}.")
    return ext[1:]


def extract(filename: str, data: bytes, limits: Optional[Limits] = None) -> Extracted:
    limits = limits or Limits()
    if len(data) > limits.max_bytes:
        raise ExtractionError(f"The file is {len(data) / 1048576:.1f} MB; the limit is {limits.max_bytes // 1048576} MB.")
    kind = detect_kind(filename, data)
    fn = {"pdf": _pdf, "doc": _doc, "docx": _docx, "txt": _txt, "csv": _csv, "xls": _xls, "xlsx": _xlsx}[kind]
    try:
        out = fn(filename, data, limits)
    except ExtractionError:
        raise
    except MemoryError:
        raise ExtractionError("The file is too large to process.")
    except Exception as e:  # a damaged file in any parser: one clear message, never a stack trace for the user
        raise ExtractionError(f"The {kind.upper()} file could not be read; it may be damaged ({type(e).__name__}).") from e
    out.kind = kind
    if out.char_count() > limits.max_chars:
        raise ExtractionError(f"The file holds more than {limits.max_chars:,} characters of text. Split it into smaller files.")
    if not out.sections and not out.tables:
        raise ExtractionError("No readable text was found in the file.")
    return out


# --------------------------------------------------------------------------------------------------------------- helpers

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(text: str) -> str:
    """Normalise whitespace while keeping paragraph breaks; drop control characters."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace(" ", " ")
    text = _CTRL.sub(" ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _decode_text(data: bytes) -> str:
    if data.startswith(b"\xef\xbb\xbf"):
        return data[3:].decode("utf-8", errors="replace")
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16", errors="replace")
    sample = data[:4000]
    if sample and sample.count(b"\x00") > len(sample) // 4:  # UTF-16 without a BOM
        return data.decode("utf-16-le" if sample[1:2] == b"\x00" else "utf-16-be", errors="replace")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252", errors="replace")


def _check_binary(text: str) -> None:
    sample = text[:20000]
    if not sample:
        return
    bad = sum(1 for ch in sample if ch == "\x00" or ch == "�" or (ord(ch) < 32 and ch not in "\n\r\t\f"))
    if bad / len(sample) > 0.05:
        raise ExtractionError("This file does not look like readable text.")


def _check_zip(data: bytes, limits: Limits) -> zipfile.ZipFile:
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as e:
        raise ExtractionError("The file is damaged and could not be opened.") from e
    total = sum(i.file_size for i in z.infolist())
    if total > limits.max_unzipped_bytes or total > max(len(data), 1) * limits.max_zip_ratio:
        raise ExtractionError("The file expands to an unsafe size and was refused.")
    if any(i.flag_bits & 0x1 for i in z.infolist()):
        raise ExtractionError("The file is password-protected. Remove the password and upload it again.")
    return z


def cell_text(value) -> str:
    """A spreadsheet cell as text: 120000.0 -> "120000", dates as ISO, None -> ""."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        if value != value:  # NaN
            return ""
        return str(int(value)) if value.is_integer() else f"{value:.10g}"
    if isinstance(value, datetime):
        return value.date().isoformat() if value.time() == time(0, 0) else value.isoformat(sep=" ", timespec="minutes")
    if isinstance(value, (date, time)):
        return value.isoformat()
    return re.sub(r"\s+", " ", str(value)).strip()


def _is_number(text: str) -> bool:
    return bool(re.fullmatch(r"[-+]?[\d,]*\.?\d+%?", text.replace(" ", ""))) if text else False


def build_table(name: str, grid: List[List[str]], max_rows: int, warnings: List[str]) -> Optional[Table]:
    """Turns a grid of cell texts into a Table: finds the header row (the first row that is mostly text labels), keeps the
    title rows above it as a caption, names blank header cells and makes duplicate names unique."""
    rows = [r for r in grid if any(c for c in r)]
    if not rows:
        return None
    width = max(len(r) for r in rows)
    # trim columns that are empty in every row
    keep = [i for i in range(width) if any(i < len(r) and r[i] for r in rows)]
    rows = [[(r[i] if i < len(r) else "") for i in keep] for r in rows]
    width = len(keep)
    header_at = 0
    for i, r in enumerate(rows[:15]):
        filled = [c for c in r if c]
        if len(filled) >= max(2, (width + 1) // 2) and sum(not _is_number(c) for c in filled) >= len(filled) * 0.6:
            header_at = i
            break
    caption = " ".join(" ".join(c for c in r if c) for r in rows[:header_at]).strip()
    header, seen = [], {}
    for i, h in enumerate(rows[header_at]):
        h = h or f"Column {i + 1}"
        if h in seen:
            seen[h] += 1
            h = f"{h} ({seen[h]})"
        else:
            seen[h] = 1
        header.append(h)
    body = rows[header_at + 1:]
    if len(body) > max_rows:
        warnings.append(f"{name}: only the first {max_rows:,} of {len(body):,} rows were indexed.")
        body = body[:max_rows]
    if not body:  # a single row: index it as text, not as a table
        return Table(name=name, header=[f"Column {i + 1}" for i in range(width)], rows=[rows[header_at]], caption=caption)
    return Table(name=name, header=header, rows=body, caption=caption)


def _fill_merged(grid: List[List[str]], ranges: Iterable[tuple]) -> None:
    """Copies a merged cell's value into every cell it covers (a course name merged over its fee rows applies to each)."""
    for r0, c0, r1, c1 in ranges:  # 0-based, inclusive
        if r0 >= len(grid) or c0 >= len(grid[r0]):
            continue
        value = grid[r0][c0]
        for r in range(r0, min(r1, len(grid) - 1) + 1):
            row = grid[r]
            for c in range(c0, c1 + 1):
                while len(row) <= c:
                    row.append("")
                if not row[c]:
                    row[c] = value


# ------------------------------------------------------------------------------------------------------------ extractors

def _pdf(filename: str, data: bytes, limits: Limits) -> Extracted:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
    except PdfReadError as e:
        raise ExtractionError("The PDF is damaged and could not be opened.") from e
    if reader.is_encrypted:
        try:
            if not reader.decrypt(""):
                raise ExtractionError("The PDF is password-protected. Remove the password and upload it again.")
        except ExtractionError:
            raise
        except Exception as e:
            raise ExtractionError("The PDF is password-protected. Remove the password and upload it again.") from e
    out = Extracted(kind="pdf")
    pages = reader.pages
    if len(pages) > limits.max_pages:
        out.warnings.append(f"Only the first {limits.max_pages} of {len(pages)} pages were indexed.")
    empty_pages = []
    for n, page in enumerate(pages[: limits.max_pages], start=1):
        try:
            text = clean_text(page.extract_text() or "")
        except Exception:
            text = ""
            out.warnings.append(f"Page {n} could not be read.")
        if len(text) < 3:
            empty_pages.append(n)
            continue
        out.sections.append(Section(text, {"page": n}))
    out.meta = {"pages": len(pages)}
    ocr_read = []
    if empty_pages:
        from backend.ai.engine.rag import ocr

        if limits.ocr and ocr.available():
            todo = empty_pages[: limits.ocr_max_pages]
            if len(empty_pages) > len(todo):
                out.warnings.append(f"Only the first {len(todo)} of {len(empty_pages)} scanned pages were read with OCR.")
            for n, text in sorted(ocr.ocr_pages(data, todo, dpi=limits.ocr_dpi).items()):
                text = clean_text(text)
                if len(text) >= 3:
                    out.sections.append(Section(text, {"page": n, "ocr": True}))
                    ocr_read.append(n)
            out.sections.sort(key=lambda s: s.meta.get("page", 0))
            out.meta["ocr_pages"] = ocr_read
            out.meta["ocr_languages"] = ocr.languages()
            if ocr_read:
                out.warnings.append(f"{len(ocr_read)} scanned page(s) were read with OCR (text recognition). Check figures such as "
                                    "fees and dates against the original; a text-based PDF, DOCX or XLSX is more reliable.")
        elif not out.sections:
            raise ExtractionError("No selectable text was found in this PDF. It is probably a scanned image, and text recognition "
                                  "(OCR) is not available on this server. Upload a text-based PDF, a DOCX or a TXT file instead.")
    if not out.sections:
        raise ExtractionError("No text could be read from this PDF, not even with text recognition (OCR). It may be a photo of "
                              "low quality or have no text. Upload a text-based PDF, a DOCX or a TXT file instead.")
    unread = [n for n in empty_pages if n not in ocr_read]
    if unread:
        out.warnings.append(f"{len(unread)} page(s) had no readable text.")
    return out


_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _docx_paragraph(p) -> str:
    parts = []
    for el in p.iter():
        tag = el.tag
        if tag == _W + "t" and el.text:
            parts.append(el.text)
        elif tag == _W + "tab":
            parts.append("\t")
        elif tag in (_W + "br", _W + "cr"):
            parts.append("\n")
    return "".join(parts)


def _docx_style(p) -> str:
    st = p.find(f"{_W}pPr/{_W}pStyle")
    return (st.get(_W + "val") or "") if st is not None else ""


def _docx(filename: str, data: bytes, limits: Limits) -> Extracted:
    z = _check_zip(data, limits)
    if "word/document.xml" not in z.namelist():
        raise ExtractionError("This file is not a valid DOCX document.")
    root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(_W + "body")
    out = Extracted(kind="docx")
    heading = ""
    buf: List[str] = []

    def flush():
        text = clean_text("\n".join(buf))
        if text:
            out.sections.append(Section(text, {"heading": heading} if heading else {}))
        buf.clear()

    n_tables = 0
    for el in list(body) if body is not None else []:
        if el.tag == _W + "p":
            text = _docx_paragraph(el).strip()
            if not text:
                continue
            style = _docx_style(el).lower()
            if style.startswith(("heading", "title")) or style in ("subtitle",):
                flush()
                heading = text
                buf.append(f"## {text}")
            elif el.find(f"{_W}pPr/{_W}numPr") is not None:
                buf.append(f"- {text}")
            else:
                buf.append(text)
        elif el.tag == _W + "tbl":
            n_tables += 1
            grid = []
            for tr in el.iter(_W + "tr"):
                grid.append([clean_text(" ".join(_docx_paragraph(p) for p in tc.iter(_W + "p"))).replace("\n", " ")
                             for tc in tr.findall(_W + "tc")])
            table = build_table(f"Table {n_tables}" + (f" ({heading})" if heading else ""), grid, limits.max_rows, out.warnings)
            if table:
                out.tables.append(table)
    flush()
    out.meta = {"tables": n_tables}
    return out


_SPRM_P_IN_TABLE, _SPRM_P_TTP, _SPRM_P_INNER_TTP, _SPRM_P_ITAP = 0x2416, 0x2417, 0x244C, 0x6649


def _sprm_operand_size(sprm: int, grpprl: bytes, at: int) -> int:
    spra = (sprm >> 13) & 7
    if spra in (0, 1):
        return 1
    if spra in (2, 4, 5):
        return 2
    if spra == 3:
        return 4
    if spra == 7:
        return 3
    if sprm in (0xD608, 0xC615):  # sprmTDefTable / sprmPChgTabs: 2-byte length
        return 2 + struct.unpack_from("<H", grpprl, at)[0] - 1 if sprm == 0xD608 else 1 + grpprl[at]
    return 1 + grpprl[at]


def _papx_flags(grpprl: bytes) -> tuple:
    """(in_table, row_end) from a paragraph's sprms ([MS-DOC] 2.6.2): sprmPFInTable / sprmPItap mark a table cell paragraph,
    sprmPFTtp / sprmPFInnerTtp the row's end mark."""
    in_table = ttp = False
    i = 2  # istd
    while i + 2 <= len(grpprl):
        sprm = struct.unpack_from("<H", grpprl, i)[0]
        i += 2
        if i > len(grpprl):
            break
        size = _sprm_operand_size(sprm, grpprl, i) if i < len(grpprl) else 1
        operand = grpprl[i:i + size]
        if sprm == _SPRM_P_IN_TABLE and operand[:1] == b"\x01":
            in_table = True
        elif sprm in (_SPRM_P_TTP, _SPRM_P_INNER_TTP) and operand[:1] == b"\x01":
            in_table = ttp = True
        elif sprm == _SPRM_P_ITAP and len(operand) == 4 and struct.unpack("<i", operand)[0] > 0:
            in_table = True
        i += max(size, 1)
    return in_table, ttp


def _doc_paragraph_runs(wd: bytes, tbl: bytes, fc_bte: int, lcb_bte: int) -> List[tuple]:
    """[(fc_start, fc_end, in_table, row_end)] from the PlcBtePapx and its PAPX FKP pages."""
    runs = []
    if not lcb_bte or fc_bte + lcb_bte > len(tbl):
        return runs
    n = (lcb_bte - 4) // 8
    pns = struct.unpack_from(f"<{n}I", tbl, fc_bte + (n + 1) * 4)
    for pn in pns:
        base = (pn & 0x3FFFFF) * 512
        page = wd[base: base + 512]
        if len(page) < 512:
            continue
        crun = page[511]
        rgfc = struct.unpack_from(f"<{crun + 1}I", page, 0)
        for k in range(crun):
            off = page[(crun + 1) * 4 + k * 13] * 2
            if off == 0:
                runs.append((rgfc[k], rgfc[k + 1], False, False))
                continue
            cb = page[off]
            grpprl = page[off + 2: off + 2 + 2 * page[off + 1]] if cb == 0 else page[off + 1: off + 1 + 2 * cb - 1]
            runs.append((rgfc[k], rgfc[k + 1], *_papx_flags(grpprl)))
    return runs


def _doc(filename: str, data: bytes, limits: Limits) -> Extracted:
    """Word 97-2003 (.doc): the main document text through the piece table ([MS-DOC] 2.4.1), and table structure from the
    paragraph properties: a cell's paragraphs end with a cell mark, a row ends with a row-end (TTP) mark, so tables come back
    as rows and columns (and their rows can be looked up exactly, like a spreadsheet). Formatting is not recovered."""
    import bisect

    import olefile

    try:
        ole = olefile.OleFileIO(io.BytesIO(data))
    except Exception as e:
        raise ExtractionError("The DOC file is damaged and could not be opened.") from e
    try:
        if not ole.exists("WordDocument"):
            raise ExtractionError("This file is not a Word document.")
        wd = ole.openstream("WordDocument").read()
        if len(wd) < 0x200 or struct.unpack_from("<H", wd, 0)[0] != 0xA5EC:
            raise ExtractionError("This Word file is too old or damaged to read. Save it as DOCX and upload it again.")
        flags = struct.unpack_from("<H", wd, 0x0A)[0]
        if flags & 0x0100:
            raise ExtractionError("The DOC file is password-protected. Remove the password and upload it again.")
        table_name = "1Table" if flags & 0x0200 else "0Table"
        if not ole.exists(table_name):
            raise ExtractionError("The DOC file is damaged (missing table stream).")
        tbl = ole.openstream(table_name).read()
        csw = struct.unpack_from("<H", wd, 32)[0]
        lw_at = 32 + 2 + csw * 2 + 2
        ccp_text = struct.unpack_from("<i", wd, lw_at + 3 * 4)[0]
        cslw = struct.unpack_from("<H", wd, lw_at - 2)[0]
        fclcb_at = lw_at + cslw * 4 + 2
        fc_clx, lcb_clx = struct.unpack_from("<II", wd, fclcb_at + 33 * 8)
        fc_bte, lcb_bte = struct.unpack_from("<II", wd, fclcb_at + 13 * 8)
        clx = tbl[fc_clx: fc_clx + lcb_clx]
        i = 0
        while i < len(clx) and clx[i] == 0x01:  # Prc entries: skip
            i += 3 + struct.unpack_from("<h", clx, i + 1)[0]
        if i >= len(clx) or clx[i] != 0x02:
            raise ExtractionError("The DOC file's text table could not be read. Save it as DOCX and upload it again.")
        lcb = struct.unpack_from("<I", clx, i + 1)[0]
        plc = clx[i + 5: i + 5 + lcb]
        n = (len(plc) - 4) // 12
        cps = struct.unpack_from(f"<{n + 1}I", plc, 0)
        chars: List[str] = []
        fcs: List[int] = []  # the file position of every character: paragraph properties are keyed by it
        for k in range(n):
            start, end = cps[k], cps[k + 1]
            if start >= ccp_text:
                break
            end = min(end, ccp_text)
            fc = struct.unpack_from("<I", plc, (n + 1) * 4 + k * 8 + 2)[0]
            if fc & 0x40000000:
                off = (fc & 0x3FFFFFFF) // 2
                text = wd[off: off + (end - start)].decode("cp1252", errors="replace")
                chars.extend(text)
                fcs.extend(off + j for j in range(len(text)))
            else:
                off = fc & 0x3FFFFFFF
                text = wd[off: off + 2 * (end - start)].decode("utf-16-le", errors="replace")
                chars.extend(text)
                fcs.extend(off + 2 * j for j in range(len(text)))
        try:
            runs = _doc_paragraph_runs(wd, tbl, fc_bte, lcb_bte)
        except Exception:
            runs = []  # unreadable paragraph properties: text without table structure
    finally:
        ole.close()

    starts = [r[0] for r in runs]

    def flags_at(fc: int) -> tuple:
        k = bisect.bisect_right(starts, fc) - 1
        if 0 <= k < len(runs) and runs[k][0] <= fc < runs[k][1]:
            return runs[k][2], runs[k][3]
        return False, False

    def clean_field_codes(text: str) -> str:
        text = re.sub(r"\x13[^\x13\x14\x15]*\x14", "", text)  # field instructions (keep the field's shown result)
        text = re.sub(r"\x13[^\x13\x14\x15]*\x15", "", text)
        return text.replace("\x15", "").replace("\x0b", "\n").replace("\x0c", "\n\n")

    out = Extracted(kind="doc")
    paragraphs: List[str] = []
    grid: List[List[str]] = []
    row: List[str] = []
    cell: List[str] = []
    buf: List[str] = []
    n_tables = 0
    heading = ""

    def close_table():
        nonlocal grid, n_tables
        if grid:
            n_tables += 1
            table = build_table(f"Table {n_tables}" + (f" ({heading})" if heading else ""), grid, limits.max_rows, out.warnings)
            if table:
                out.tables.append(table)
            grid = []

    for ch, fc in zip(chars, fcs):
        if ch not in ("\r", "\x07"):
            buf.append(ch)
            continue
        text = clean_text(clean_field_codes("".join(buf)))
        buf = []
        in_table, row_end = flags_at(fc)
        if runs and row_end:
            if cell or text:
                row.append(" ".join(cell + ([text] if text else [])))
                cell = []
            if row:
                grid.append(row)
            row = []
        elif runs and in_table:
            if ch == "\x07":  # end of a cell
                row.append(" ".join(cell + ([text] if text else [])).strip())
                cell = []
            elif text:  # a cell with several paragraphs
                cell.append(text)
        elif runs or ch == "\r":
            close_table()
            if text:
                paragraphs.append(text)
                if len(text) < 80 and not text.endswith((".", ":", ";", ",")):
                    heading = text
        else:  # no paragraph properties: keep cells readable as text
            if text:
                paragraphs.append(text + " |")
    if row:
        grid.append(row)
    close_table()
    body = clean_text("\n\n".join(paragraphs)).replace(" |\n\n", " | ")
    for block in re.split(r"\n{2,}(?=\S)", body):
        if block.strip():
            out.sections.append(Section(block.strip()))
    out.meta = {"tables": n_tables}
    return out


def _txt(filename: str, data: bytes, limits: Limits) -> Extracted:
    text = _decode_text(data)
    _check_binary(text)
    text = clean_text(text)
    out = Extracted(kind="txt")
    if text:
        out.sections.append(Section(text))
    return out


def _csv(filename: str, data: bytes, limits: Limits) -> Extracted:
    text = _decode_text(data)
    _check_binary(text)
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    grid = []
    for row in reader:
        grid.append([cell_text(c) for c in row])
        if len(grid) > limits.max_rows + 20:
            break
    out = Extracted(kind="csv")
    name = re.sub(r"\.[^.]+$", "", filename.rsplit("/", 1)[-1]) or "CSV"
    table = build_table(name, grid, limits.max_rows, out.warnings)
    if table:
        out.tables.append(table)
    out.meta = {"rows": len(table.rows) if table else 0}
    return out


def _xlsx(filename: str, data: bytes, limits: Limits) -> Extracted:
    from openpyxl import load_workbook

    _check_zip(data, limits)
    small = len(data) <= 5 * 1024 * 1024  # small books load fully so merged cells can be filled in; big ones stream
    wb = load_workbook(io.BytesIO(data), read_only=not small, data_only=True)
    out = Extracted(kind="xlsx")
    sheets = []
    try:
        for ws in wb.worksheets:
            if getattr(ws, "sheet_state", "visible") != "visible":
                continue
            grid = []
            for row in ws.iter_rows(values_only=True):
                grid.append([cell_text(v) for v in row])
                if len(grid) > limits.max_rows + 20:
                    break
            if small:
                _fill_merged(grid, [(m.min_row - 1, m.min_col - 1, m.max_row - 1, m.max_col - 1) for m in ws.merged_cells.ranges])
            table = build_table(ws.title, grid, limits.max_rows, out.warnings)
            if table:
                out.tables.append(table)
                sheets.append({"name": ws.title, "rows": len(table.rows), "columns": table.header})
    finally:
        wb.close()
    out.meta = {"sheets": sheets}
    return out


def _xls(filename: str, data: bytes, limits: Limits) -> Extracted:
    import xlrd

    try:
        book = xlrd.open_workbook(file_contents=data, formatting_info=True, on_demand=True)
    except xlrd.biffh.XLRDError as e:
        if "encrypt" in str(e).lower():
            raise ExtractionError("The XLS file is password-protected. Remove the password and upload it again.") from e
        raise ExtractionError("The XLS file could not be read; it may be damaged.") from e
    out = Extracted(kind="xls")
    sheets = []
    try:
        for idx in range(book.nsheets):
            sh = book.sheet_by_index(idx)
            if getattr(sh, "visibility", 0) != 0:
                continue
            grid = []
            for r in range(min(sh.nrows, limits.max_rows + 20)):
                row = []
                for c in range(sh.ncols):
                    cell = sh.cell(r, c)
                    if cell.ctype == xlrd.XL_CELL_DATE:
                        try:
                            row.append(cell_text(xlrd.xldate.xldate_as_datetime(cell.value, book.datemode)))
                        except Exception:
                            row.append(cell_text(cell.value))
                    elif cell.ctype == xlrd.XL_CELL_BOOLEAN:
                        row.append(cell_text(bool(cell.value)))
                    elif cell.ctype == xlrd.XL_CELL_ERROR:
                        row.append("")
                    else:
                        row.append(cell_text(cell.value))
                grid.append(row)
            _fill_merged(grid, [(r0, c0, r1 - 1, c1 - 1) for r0, r1, c0, c1 in sh.merged_cells])
            table = build_table(sh.name, grid, limits.max_rows, out.warnings)
            if table:
                out.tables.append(table)
                sheets.append({"name": sh.name, "rows": len(table.rows), "columns": table.header})
            book.unload_sheet(idx)
    finally:
        book.release_resources()
    out.meta = {"sheets": sheets}
    return out
