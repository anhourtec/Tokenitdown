# TokenItDown processing service (MarkItDown wrapped in FastAPI).
FROM python:3.14-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    EXIFTOOL_PATH=/usr/bin/exiftool \
    FFMPEG_PATH=/usr/bin/ffmpeg

# Runtime binaries MarkItDown shells out to: ffmpeg for audio transcription,
# exiftool for image/audio EXIF metadata extraction.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libmagic1 exiftool curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Run as an unprivileged user (MarkItDown runs with the process's privileges).
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
