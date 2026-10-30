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

from backend.ai.engine.rag import languages

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
            "uk": "united kingdom", "usa": "united states"}  # not "us": "fees for us" is not about the United States

_NUMERIC = re.compile(r"^[^\d]{0,4}[-+]?[\d,]*\.?\d+\s*(%|/-|lakh|lakhs|crore|k|inr|rs|usd|gbp|eur)?\.?$", re.I)


_YEAR_RANGE = re.compile(r"\b(20\d\d)\s*[-/–—]\s*(?:20)?(\d\d)\b")


def normalize(s: str) -> str:
    """Folded words in any language (languages.words), with academic years in one form: 2026-27, 2026/27 and 2026-2027
    all become "2026 27"."""
    s = _YEAR_RANGE.sub(lambda m: f"{m.group(1)} {m.group(2)}", languages.fold(s or ""))
    return " ".join(languages.words(s))


def _compact(s: str) -> str:
    return s.replace(" ", "")


def _is_amount(v: str) -> bool:
    return bool(v) and bool(_NUMERIC.match(v.strip()))


def expand_query(query: str) -> str:
    """The question in comparable form, plus the same question with the caller's language's words for countries,
    categories and courses in English (languages.to_english), plus nationality words as countries."""
    q = f" {normalize(query)} "
    english = normalize(languages.to_english(_YEAR_RANGE.sub(lambda m: f"{m.group(1)}-{m.group(2)}", languages.fold(query or ""))))
    if english and english != q.strip():
        q += english + " "
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


ROLES = ("course", "country", "category", "year", "fee", "other", "ignore")
VALUE_ROLES = ("fee",)

# What a column is about, from its heading in any of the agent's languages (folded and mapped to English first).
_ROLE_WORDS = {
    "fee": {"fee", "fees", "tuition", "price", "prices", "cost", "costs", "amount", "charge", "charges", "rate", "rates", "inr",
            "usd", "gbp", "eur", "rs", "rupees", "total"},
    "year": {"year", "years", "session", "intake", "batch", "academic", "semester", "term"},
    "country": {"country", "countries", "nationality", "nation", "region", "origin", "citizenship"},
    "category": {"category", "categories", "type", "quota", "student", "applicant", "residency", "domestic", "international"},
    "course": {"course", "courses", "programme", "program", "programs", "degree", "branch", "specialization", "specialisation",
               "stream", "subject", "treatment", "service", "services", "room", "package", "plan", "item"},
}
_YEAR_VALUE = re.compile(r"^20\d\d(\s*[-/–]\s*(20)?\d\d)?$")


def guess_role(header: str, values: List[str]) -> str:
    """course | country | category | year | fee | other, from the heading first and the values second."""
    words = set(normalize(languages.to_english(header)).split())
    for role in ("fee", "year", "country", "category", "course"):
        if words & _ROLE_WORDS[role]:
            return role
    vals = [v for v in values if v][:200]
    if not vals:
        return "other"
    if sum(bool(_YEAR_VALUE.match(v.strip())) for v in vals) >= 0.7 * len(vals):
        return "year"
    if sum(_is_amount(v) for v in vals) >= 0.7 * len(vals):
        return "fee"
    from backend.ai.workflows.caller_slots import country_in

    if sum(bool(country_in(v)) for v in vals) >= 0.6 * len(vals):
        return "country"
    return "other"


class _Table:
    """One table for lookups. `mapping` ({original column: {"role", "label", "aliases"}}) is what the business confirmed in
    the Columns screen: an ignored column is left out, a "fee" column holds the answers, every other role is a column the
    caller's words are matched against; `label` renames the column; `aliases` are other names for a value
    ({"Computer Science": "B.Tech CSE"})."""

    def __init__(self, document_id: str, name: str, source: str, rows: List[dict], mapping: Optional[dict] = None):
        self.document_id = document_id
        self.name = name
        self.source = source
        mapping = mapping or {}
        raw_columns = list(dict.fromkeys(k for r in rows for k in r.keys()))
        keep = [c for c in raw_columns if (mapping.get(c) or {}).get("role") != "ignore"]
        rename = {c: ((mapping.get(c) or {}).get("label") or c).strip() or c for c in keep}
        self.rows = [{rename[c]: r[c] for c in keep if c in r} for r in rows]
        self.columns: List[str] = [rename[c] for c in keep]
        self.value_columns: List[str] = []
        self.category_columns: List[str] = []
        for c in keep:
            col = rename[c]
            role = (mapping.get(c) or {}).get("role")
            vals = [r.get(col, "") for r in self.rows if r.get(col, "")]
            if role in VALUE_ROLES or (role is None and vals and sum(_is_amount(v) for v in vals) >= 0.7 * len(vals)):
                self.value_columns.append(col)
            else:
                self.category_columns.append(col)
        # normalised once per table, not on every question (a 6,000-row fee sheet is filtered on every lookup)
        self.norm_rows: List[Dict[str, str]] = [{col: normalize(r.get(col, "")) for col in self.category_columns} for r in self.rows]
        self.distinct: Dict[str, Dict[str, str]] = {}
        self.aliases: Dict[str, Dict[str, str]] = {}  # column -> {normalised alias: normalised value}
        for c in keep:
            col = rename[c]
            if col not in self.category_columns:
                continue
            d: Dict[str, str] = {}
            for r in self.rows:
                v = r.get(col, "")
                if v and len(v) <= 80:
                    d.setdefault(normalize(v), v)
            self.distinct[col] = d
            self.aliases[col] = {normalize(a): normalize(v) for a, v in ((mapping.get(c) or {}).get("aliases") or {}).items()
                                 if normalize(a) and normalize(v) in d}


def build_tables(records: List[dict], mappings: Optional[Dict[tuple, dict]] = None) -> List[_Table]:
    """records: [{"document_id", "table_name", "source", "data"}] for ONE business. mappings: {(document_id, table_name):
    column mapping} from each document's confirmed Columns settings."""
    groups: Dict[tuple, List[dict]] = defaultdict(list)
    sources: Dict[tuple, str] = {}
    for r in records:
        key = (r["document_id"], r["table_name"])
        groups[key].append(r["data"])
        sources[key] = r.get("source") or ""
    mappings = mappings or {}
    return [_Table(doc, name, sources[(doc, name)], rows, mappings.get((doc, name))) for (doc, name), rows in groups.items()]


def profile(name: str, rows: List[dict], mapping: Optional[dict] = None) -> dict:
    """What the Columns screen shows for one table: each column's detected and confirmed role, label, sample values and
    aliases, and the problems that would make an exact lookup wrong or impossible."""
    mapping = mapping or {}
    columns = list(dict.fromkeys(k for r in rows for k in r.keys()))
    out_cols, issues = [], []
    roles = {}
    for c in columns:
        values = [r.get(c, "") for r in rows]
        filled = [v for v in values if v]
        detected = guess_role(c, filled)
        m = mapping.get(c) or {}
        role = m.get("role") or detected
        roles[c] = role
        samples = list(dict.fromkeys(filled))[:5]
        out_cols.append({"name": c, "label": m.get("label") or "", "role": role, "detected_role": detected,
                         "confirmed": bool(m.get("role")), "distinct": len(set(filled)), "empty": len(values) - len(filled),
                         "samples": samples, "aliases": m.get("aliases") or {}})
        if re.fullmatch(r"Column \d+", c):
            issues.append({"level": "warning", "column": c, "message": f"'{c}' has no heading; give it a label so callers' words can match it."})
    value_cols = [c for c in columns if roles[c] in VALUE_ROLES]
    label_cols = [c for c in columns if roles[c] not in VALUE_ROLES and roles[c] != "ignore"]
    if not value_cols:
        issues.append({"level": "warning", "column": None, "message": "No fee or price column was found. Mark the column that holds "
                       "the amounts as Fee so exact answers can be given."})
    for c in value_cols:
        empty = [i + 1 for i, r in enumerate(rows) if not r.get(c, "")]
        if empty:
            issues.append({"level": "warning", "column": c, "message": f"'{c}' is empty in {len(empty)} row(s) ({_rows(empty)}). "
                           "The AI will say no figure is listed for those."})
        odd = [i + 1 for i, r in enumerate(rows) if r.get(c, "") and not _is_amount(r[c])]
        if odd and len(odd) < len(rows):
            issues.append({"level": "warning", "column": c, "message": f"'{c}' has text instead of an amount in {len(odd)} row(s) "
                           f"({_rows(odd)}), e.g. '{rows[odd[0] - 1][c]}'."})
    if value_cols and label_cols:
        seen: Dict[tuple, int] = {}
        conflicts = []
        for i, r in enumerate(rows):
            key = tuple(_compact(normalize(r.get(c, ""))) for c in label_cols)  # "B.Tech CSE" and "BTech CSE" are one value
            vals = tuple(r.get(c, "") for c in value_cols)
            if key in seen:
                j = seen[key]
                if tuple(rows[j].get(c, "") for c in value_cols) != vals:
                    conflicts.append((j + 1, i + 1))
            else:
                seen[key] = i
        for a, b in conflicts[:5]:
            issues.append({"level": "error", "column": None, "message": f"Rows {a} and {b} describe the same thing but list different "
                           "amounts, so no single answer can be given. Fix the sheet or add the column that tells them apart."})
    for c in label_cols:
        spellings: Dict[str, set] = defaultdict(set)
        for r in rows:
            v = r.get(c, "")
            if v:
                spellings[_compact(normalize(v))].add(v)
        for forms in spellings.values():
            if len(forms) > 1:
                issues.append({"level": "info", "column": c, "message": f"'{c}' writes one value in {len(forms)} ways: "
                               f"{', '.join(sorted(forms)[:4])}. They are treated as the same value."})
    return {"name": name, "rows": len(rows), "columns": out_cols, "issues": issues}


def _rows(numbers: List[int]) -> str:
    return "rows " + ", ".join(map(str, numbers[:5])) + (" …" if len(numbers) > 5 else "")


def _constraints(table: _Table, q: str, q_joins: set, columns=None) -> Dict[str, set]:
    out: Dict[str, set] = {}
    for col in (columns if columns is not None else table.category_columns):
        hit = {norm for norm in table.distinct[col] if _mentions(norm, q, q_joins)}
        hit |= {value for alias, value in table.aliases.get(col, {}).items() if _mentions(alias, q, q_joins)}
        # a shorter value inside a longer matched one ("cse" inside "b tech cse") is not a separate mention
        hit = {h for h in hit if not any(h != o and f" {h} " in f" {o} " for o in hit)}
        if hit:
            out[col] = hit
    return out


def _matches(table: _Table, constraints: Dict[str, set]) -> List[int]:
    return [i for i, n in enumerate(table.norm_rows) if all(n[col] in vals for col, vals in constraints.items())]


def lookup(tables: List[_Table], query: str, max_rows: int = 10, hints: Optional[List[str]] = None) -> Optional[dict]:
    """`hints`: what the caller already said earlier in the conversation (the workflow's country, academic year, student
    category, programme). A table is chosen only by what the question itself names; hints then fill in columns the question
    did not name, and only when they leave at least one row (a new value in the question always wins)."""
    if not tables or not query or not query.strip():
        return None
    q = expand_query(query)
    q_joins = _word_joins(q)
    q_words = set(q.split())
    best = None
    for table in tables:
        constraints = _constraints(table, q, q_joins)
        if not constraints:
            continue
        header_hits = sum(1 for col in table.value_columns if set(normalize(col).split()) & q_words)
        score = len(constraints) * 10 + header_hits
        if best is None or score > best[0]:
            best = (score, table, constraints)
    if best is None:
        return None
    _, table, constraints = best
    from_context: Dict[str, set] = {}
    if hints:
        hq = expand_query(" ".join(h for h in hints if h))
        free = [c for c in table.category_columns if c not in constraints]
        for col, vals in _constraints(table, hq, _word_joins(hq), free).items():
            if len(vals) == 1 and _matches(table, {**constraints, **from_context, col: vals}):
                from_context[col] = vals
        constraints = {**constraints, **from_context}
    idx = _matches(table, constraints)
    candidates = [table.rows[i] for i in idx]
    cand_norm = [table.norm_rows[i] for i in idx]
    matched = {col: sorted(table.distinct[col][v] for v in vals) for col, vals in constraints.items()}
    out = {"table": f"{table.source} › {table.name}" if table.source else table.name, "document_id": table.document_id,
           "matched": matched, "value_columns": table.value_columns,
           "from_context": {col: sorted(table.distinct[col][v] for v in vals) for col, vals in from_context.items()}}
    if not candidates:
        out.update(status="no_match", rows=[], ask_for=[], options={})
        return out
    differing = [col for col in table.category_columns if col not in constraints and len({n[col] for n in cand_norm}) > 1]
    # several values named for one column ("Nepal or Nigeria?") is also a question back, not an answer
    multi = [col for col, vals in constraints.items() if len({_compact(v) for v in vals}) > 1]  # spellings of one value are one
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
