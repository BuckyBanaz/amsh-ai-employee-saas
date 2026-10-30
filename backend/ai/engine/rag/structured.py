"""Exact lookups in tables from the knowledge base (spreadsheets, CSVs, DOCX tables).

A fee question like "B.Tech CSE fee for a Nepali student in 2026-27" is answered by filtering rows, not by text
similarity: every table value the question names (course, country or nationality, student category, academic year) must
match the row. The outcome is explicit:

  exact      one row fits: quote its values as they are
  ambiguous  several rows fit and they differ in columns the question did not name: `ask_for` lists those columns (with
             their options) so the agent asks instead of picking one, averaging or calculating
  no_match   the question names values that never occur together (no fee is listed for that combination)

Nothing here computes or infers a number: values are returned exactly as written in the business's document."""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Optional

# Nationality words a caller uses for the country column ("Nepali student" -> Nepal), and common category synonyms.
DEMONYMS = {
    "indian": "india", "nepali": "nepal", "nepalese": "nepal", "bangladeshi": "bangladesh", "nigerian": "nigeria",
    "sri lankan": "sri lanka", "srilankan": "sri lanka", "pakistani": "pakistan", "bhutanese": "bhutan", "afghan": "afghanistan",
    "kenyan": "kenya", "ghanaian": "ghana", "ugandan": "uganda", "tanzanian": "tanzania", "ethiopian": "ethiopia",
    "british": "united kingdom", "english": "united kingdom", "american": "united states", "canadian": "canada",
    "australian": "australia", "emirati": "uae", "saudi": "saudi arabia", "chinese": "china", "japanese": "japan",
    "vietnamese": "vietnam", "thai": "thailand", "indonesian": "indonesia", "malaysian": "malaysia", "filipino": "philippines",
    "zambian": "zambia", "zimbabwean": "zimbabwe", "sudanese": "sudan", "egyptian": "egypt", "iraqi": "iraq",
    "iranian": "iran", "maldivian": "maldives", "mauritian": "mauritius", "cameroonian": "cameroon", "rwandan": "rwanda",
    "somali": "somalia", "omani": "oman", "qatari": "qatar", "kuwaiti": "kuwait", "yemeni": "yemen", "myanmarese": "myanmar",
    "burmese": "myanmar", "south african": "south africa", "german": "germany", "french": "france",
}
SYNONYMS = {"foreign": "international", "overseas": "international", "abroad": "international", "local": "domestic",
            "uk": "united kingdom", "usa": "united states", "us": "united states", "u s": "united states"}

_NUMERIC = re.compile(r"^[^\d]{0,4}[-+]?[\d,]*\.?\d+\s*(%|/-|lakh|lakhs|crore|k|inr|rs|usd|gbp|eur)?\.?$", re.I)


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w]+", " ", (s or "").lower())).strip()


def _compact(s: str) -> str:
    return s.replace(" ", "")


def _is_amount(v: str) -> bool:
    return bool(v) and bool(_NUMERIC.match(v.strip()))


def expand_query(query: str) -> str:
    q = f" {normalize(query)} "
    extra = []
    for word, value in list(DEMONYMS.items()) + list(SYNONYMS.items()):
        if f" {word} " in q:
            extra.append(value)
    return q + " ".join(extra) + " "


def _word_joins(q: str, longest: int = 4) -> set:
    """Every run of 1-4 consecutive query words with the spaces removed ("btech cse" -> "btech", "btechcse", ...)."""
    words = q.split()
    return {"".join(words[i:i + n]) for n in range(1, longest + 1) for i in range(len(words) - n + 1)}


def _mentions(value_norm: str, q: str, q_joins: set) -> bool:
    """The value is named in the question: as the same words, or written together ("BTech CSE" for "B.Tech CSE"). A
    joined form must cover whole words, so "Course 1" is not found inside "course 137"."""
    if not value_norm:
        return False
    if f" {value_norm} " in q:
        return True
    c = _compact(value_norm)
    return len(c) >= 4 and not c.isdigit() and c in q_joins


class _Table:
    def __init__(self, document_id: str, name: str, source: str, rows: List[dict]):
        self.document_id = document_id
        self.name = name
        self.source = source
        self.rows = rows
        self.columns: List[str] = list(dict.fromkeys(k for r in rows for k in r.keys()))
        self.value_columns: List[str] = []
        self.category_columns: List[str] = []
        for col in self.columns:
            vals = [r.get(col, "") for r in rows if r.get(col, "")]
            if vals and sum(_is_amount(v) for v in vals) >= 0.7 * len(vals):
                self.value_columns.append(col)
            else:
                self.category_columns.append(col)
        self.distinct: Dict[str, Dict[str, str]] = {}
        for col in self.category_columns:
            d: Dict[str, str] = {}
            for r in rows:
                v = r.get(col, "")
                if v and len(v) <= 80:
                    d.setdefault(normalize(v), v)
            self.distinct[col] = d


def build_tables(records: List[dict]) -> List[_Table]:
    """records: [{"document_id", "table_name", "source", "data"}] for ONE business."""
    groups: Dict[tuple, List[dict]] = defaultdict(list)
    sources: Dict[tuple, str] = {}
    for r in records:
        key = (r["document_id"], r["table_name"])
        groups[key].append(r["data"])
        sources[key] = r.get("source") or ""
    return [_Table(doc, name, sources[(doc, name)], rows) for (doc, name), rows in groups.items()]


def lookup(tables: List[_Table], query: str, max_rows: int = 10) -> Optional[dict]:
    if not tables or not query or not query.strip():
        return None
    q = expand_query(query)
    q_joins = _word_joins(q)
    q_words = set(q.split())
    best = None
    for table in tables:
        constraints: Dict[str, set] = {}
        for col in table.category_columns:
            hit = {norm for norm in table.distinct[col] if _mentions(norm, q, q_joins)}
            # a shorter value inside a longer matched one ("cse" inside "b tech cse") is not a separate mention
            hit = {h for h in hit if not any(h != o and f" {h} " in f" {o} " for o in hit)}
            if hit:
                constraints[col] = hit
        if not constraints:
            continue
        header_hits = sum(1 for col in table.value_columns if set(normalize(col).split()) & q_words)
        score = len(constraints) * 10 + header_hits
        if best is None or score > best[0]:
            best = (score, table, constraints)
    if best is None:
        return None
    _, table, constraints = best
    candidates = [r for r in table.rows if all(normalize(r.get(col, "")) in vals for col, vals in constraints.items())]
    matched = {col: sorted(table.distinct[col][v] for v in vals) for col, vals in constraints.items()}
    out = {"table": f"{table.source} › {table.name}" if table.source else table.name, "document_id": table.document_id,
           "matched": matched, "value_columns": table.value_columns}
    if not candidates:
        out.update(status="no_match", rows=[], ask_for=[], options={})
        return out
    differing = [col for col in table.category_columns if col not in constraints
                 and len({normalize(r.get(col, "")) for r in candidates}) > 1]
    # several values named for one column ("Nepal or Nigeria?") is also a question back, not an answer
    multi = [col for col, vals in constraints.items() if len(vals) > 1]
    if len(candidates) == 1:
        out.update(status="exact", rows=candidates, ask_for=[], options={})
    elif differing or multi:
        ask = differing + [c for c in multi if c not in differing]
        options = {col: sorted({r.get(col, "") for r in candidates if r.get(col, "")})[:8] for col in ask}
        out.update(status="ambiguous", rows=candidates[:max_rows], ask_for=ask, options=options)
    else:
        # the same row listed more than once, or rows equal in every label: identical values are an exact answer
        distinct_values = {tuple(r.get(c, "") for c in table.value_columns) for r in candidates}
        out.update(status="exact" if len(distinct_values) == 1 else "ambiguous", rows=candidates[:max_rows],
                   ask_for=[], options={})
    return out


def describe(result: dict) -> str:
    """One line for the agent: what the table says, or exactly what to ask."""
    rows = result.get("rows") or []
    if result["status"] == "exact":
        row = rows[0]
        return "; ".join(f"{k}: {v}" for k, v in row.items() if v)
    if result["status"] == "ambiguous":
        if result.get("ask_for"):
            return "Ask for: " + "; ".join(f"{col} ({', '.join(result['options'].get(col, []))})" for col in result["ask_for"])
        return "Several rows match: " + " | ".join("; ".join(f"{k}: {v}" for k, v in r.items() if v) for r in rows[:4])
    return "No row matches " + ", ".join(f"{col} = {'/'.join(v)}" for col, v in result["matched"].items())
