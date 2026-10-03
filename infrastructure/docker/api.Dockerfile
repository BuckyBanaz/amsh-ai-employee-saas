FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Production runs plain uvicorn. docker-compose.yml (development) sets UVICORN_ARGS="--reload".
ENV UVICORN_ARGS=""
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 ${UVICORN_ARGS}"]
