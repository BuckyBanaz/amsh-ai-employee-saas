"""Smart Semantic Chunker for Knowledge Base Documents and Web Pages.
Splits text into 500-1000 character overlapping chunks to keep policy rules,
pricing tables, and service details intact.
"""

import re


class SemanticChunker:
    def __init__(self, chunk_size: int = 750, min_chunk_size: int = 200, overlap: int = 100):
        self.chunk_size = chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap = overlap

    def chunk_text(self, text: str, source_id: str | None = None, source_name: str | None = None) -> list[dict]:
        """Splits raw document or website text into clean semantic chunks with metadata."""
        if not text or not text.strip():
            return []

        # Normalize whitespace while maintaining paragraph breaks
        clean_text = re.sub(r"\r\n|\r", "\n", text)
        paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]

        chunks: list[dict] = []
        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            # If paragraph itself exceeds max chunk size, split by sentences
            if len(para) > self.chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) <= self.chunk_size:
                        current_chunk = f"{current_chunk} {sentence}".strip()
                    else:
                        if len(current_chunk) >= self.min_chunk_size:
                            chunks.append(self._make_chunk_item(current_chunk, chunk_index, source_id, source_name))
                            chunk_index += 1
                            # Retain overlap from end of previous chunk
                            current_chunk = current_chunk[-self.overlap:] + " " + sentence
                        else:
                            current_chunk = f"{current_chunk} {sentence}".strip()
            else:
                if len(current_chunk) + len(para) <= self.chunk_size:
                    current_chunk = f"{current_chunk}\n\n{para}".strip()
                else:
                    if len(current_chunk) >= self.min_chunk_size:
                        chunks.append(self._make_chunk_item(current_chunk, chunk_index, source_id, source_name))
                        chunk_index += 1
                        current_chunk = current_chunk[-self.overlap:] + "\n\n" + para
                    else:
                        current_chunk = f"{current_chunk}\n\n{para}".strip()

        if current_chunk.strip():
            chunks.append(self._make_chunk_item(current_chunk.strip(), chunk_index, source_id, source_name))

        return chunks

    def _make_chunk_item(self, text: str, index: int, source_id: str | None, source_name: str | None = None) -> dict:
        return {
            "chunk_id": f"{source_id or 'doc'}_chunk_{index}",
            "source_id": source_id,
            "source_name": source_name or "Knowledge Base",
            "text": text,
            "char_count": len(text),
        }
