"""Smart Semantic Chunker for Knowledge Base Documents and Web Pages.
Splits text into 500-1000 character overlapping chunks to keep policy rules,
pricing tables, and service details intact.

Text is split on paragraphs, then sentences, then words (never inside a word), with the overlap starting on a word
boundary. Tables are chunked by rows with the column names on every row, so each chunk stands on its own
("Course: B.Tech CSE; Country: Nepal; Tuition Fee: 180000")."""

import re


def _tail_words(text: str, size: int) -> str:
    """The last ~`size` characters of `text`, starting at a word boundary."""
    if len(text) <= size:
        return text
    tail = text[-size:]
    cut = tail.find(" ")
    return tail[cut + 1:] if 0 <= cut < len(tail) - 1 else tail


def _split_long(piece: str, size: int) -> list[str]:
    """A sentence longer than a chunk, split on whitespace (a PDF line with no full stops, a long list)."""
    words, out, cur = piece.split(), [], ""
    for w in words:
        if len(w) > size:  # a single unbroken token (a URL, a hash): hard-split it
            if cur:
                out.append(cur)
                cur = ""
            out.extend(w[i:i + size] for i in range(0, len(w), size))
            continue
        if cur and len(cur) + 1 + len(w) > size:
            out.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        out.append(cur)
    return out


class SemanticChunker:
    def __init__(self, chunk_size: int = 750, min_chunk_size: int = 200, overlap: int = 100):
        self.chunk_size = chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap = overlap

    def split(self, text: str) -> list[str]:
        """Plain chunk texts for `text`."""
        if not text or not text.strip():
            return []
        clean_text = re.sub(r"\r\n|\r", "\n", text)
        paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
        pieces: list[tuple[str, str]] = []  # (text, joiner before it)
        for para in paragraphs:
            if len(para) <= self.chunk_size:
                pieces.append((para, "\n\n"))
                continue
            first = True
            for sentence in re.split(r"(?<=[.!?])\s+|\n", para):
                sentence = sentence.strip()
                if not sentence:
                    continue
                for part in ([sentence] if len(sentence) <= self.chunk_size else _split_long(sentence, self.chunk_size)):
                    pieces.append((part, "\n\n" if first else " "))
                    first = False

        chunks: list[str] = []
        current = ""
        for piece, joiner in pieces:
            if not current:
                current = piece
            elif len(current) + len(joiner) + len(piece) <= self.chunk_size:
                current = f"{current}{joiner}{piece}"
            elif len(current) < self.min_chunk_size and len(current) + len(piece) <= self.chunk_size * 1.5:
                current = f"{current}{joiner}{piece}"  # too small to stand alone: allow a slightly bigger chunk
            else:
                chunks.append(current)
                overlap = _tail_words(current, self.overlap) if self.overlap else ""
                current = f"{overlap}{joiner}{piece}" if overlap and len(overlap) + len(piece) < self.chunk_size else piece
        if current.strip():
            chunks.append(current.strip())
        return chunks

    def chunk_text(self, text: str, source_id: str | None = None, source_name: str | None = None) -> list[dict]:
        """Splits raw document or website text into clean semantic chunks with metadata."""
        return [self._make_chunk_item(t, i, source_id, source_name) for i, t in enumerate(self.split(text))]

    def chunk_table(self, header: list[str], rows: list[list[str]], title: str) -> list[tuple[str, dict]]:
        """Row groups of a table, each row written as "Column: value; ..." under the table's title. Returns
        (text, {"rows": [first, last]}) pairs, 1-based row numbers."""
        out: list[tuple[str, dict]] = []
        lines: list[str] = []
        first = 1
        size = len(title) + 1
        for n, row in enumerate(rows, start=1):
            cells = [f"{h}: {v}" for h, v in zip(header, row) if v]
            if not cells:
                continue
            line = "; ".join(cells)
            if lines and size + len(line) + 1 > self.chunk_size:
                out.append((title + "\n" + "\n".join(lines), {"rows": [first, n - 1]}))
                lines, first, size = [], n, len(title) + 1
            lines.append(line)
            size += len(line) + 1
        if lines:
            out.append((title + "\n" + "\n".join(lines), {"rows": [first, len(rows)]}))
        return out

    def _make_chunk_item(self, text: str, index: int, source_id: str | None, source_name: str | None = None) -> dict:
        return {
            "chunk_id": f"{source_id or 'doc'}_chunk_{index}",
            "source_id": source_id,
            "source_name": source_name or "Knowledge Base",
            "text": text,
            "char_count": len(text),
        }
