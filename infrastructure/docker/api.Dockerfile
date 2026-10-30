FROM python:3.12-slim

WORKDIR /app

# Knowledge base OCR for scanned PDFs (backend/ai/engine/rag/ocr.py): Tesseract with the languages the AI employee speaks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-ara \
       tesseract-ocr-nld tesseract-ocr-deu tesseract-ocr-spa tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

# Caller laughter detection model (checksum-pinned), outside backend/ so the development bind mount does not hide it.
ENV YAMNET_MODEL_PATH=/app/models/yamnet.tflite
RUN python -m backend.scripts.fetch_yamnet /app/models/yamnet.tflite

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Production runs plain uvicorn. docker-compose.yml (development) sets UVICORN_ARGS="--reload".
ENV UVICORN_ARGS=""
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 ${UVICORN_ARGS}"]
