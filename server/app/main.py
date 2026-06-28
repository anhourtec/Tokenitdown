"""TokenItDown processing service — a thin FastAPI wrapper around MarkItDown.

The service is internal-only (no published port in docker-compose) and gated by a
shared secret (``MARKITDOWN_SERVICE_TOKEN``) sent by the Next.js app. It exposes:

  GET  /health       liveness probe (unauthenticated)
  POST /convert      multipart file upload -> Markdown (uses convert_stream)
  POST /convert-url  JSON {url} -> Markdown (SSRF-guarded; YouTube + web pages)

Per MarkItDown's security guidance we use the narrowest API for each case:
``convert_stream`` for uploaded bytes (never touches the filesystem/network) and a
guarded fetch for URLs.
"""

from __future__ import annotations

import hmac
import io
import os
from urllib.parse import urlparse

import requests
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from markitdown import MarkItDown, StreamInfo
from pydantic import BaseModel

from .security import UnsafeURLError, assert_safe_url, safe_get

# 50 MB default upload ceiling; override with MAX_UPLOAD_BYTES.
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
SERVICE_TOKEN = os.environ.get("MARKITDOWN_SERVICE_TOKEN", "")

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
}

app = FastAPI(
    title="TokenItDown processing service",
    # No interactive docs / OpenAPI schema — this is a private machine endpoint.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# A single converter instance is reused across requests. Plugins are disabled so
# only vetted built-in converters run.
_md = MarkItDown(enable_plugins=False)


def require_token(x_service_token: str | None = Header(default=None)) -> None:
    """Reject requests without the shared service token (constant-time compare)."""
    if not SERVICE_TOKEN:
        raise HTTPException(status_code=500, detail="Service token is not configured.")
    if not x_service_token or not hmac.compare_digest(x_service_token, SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid or missing service token.")


class UrlRequest(BaseModel):
    url: str


class ConvertResponse(BaseModel):
    markdown: str
    title: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/convert", response_model=ConvertResponse, dependencies=[Depends(require_token)])
async def convert(file: UploadFile = File(...)) -> ConvertResponse:
    # Read at most MAX_UPLOAD_BYTES + 1 so we can detect oversize without buffering
    # an unbounded amount of memory.
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the maximum allowed size.")
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "upload"
    extension = os.path.splitext(filename)[1] or None
    stream_info = StreamInfo(
        filename=filename,
        extension=extension,
        mimetype=file.content_type or None,
    )

    try:
        result = _md.convert_stream(io.BytesIO(data), stream_info=stream_info)
    except Exception as exc:  # noqa: BLE001 — surface any converter failure as 422
        print(f"[convert] conversion failed for {filename!r}: {exc!r}")
        raise HTTPException(
            status_code=422,
            detail="This file could not be converted — it may be corrupted, password-protected, or an unsupported format.",
        ) from exc

    return ConvertResponse(markdown=result.markdown, title=result.title)


@app.post("/convert-url", response_model=ConvertResponse, dependencies=[Depends(require_token)])
def convert_url(req: UrlRequest) -> ConvertResponse:
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required.")

    try:
        assert_safe_url(url)
        host = (urlparse(url).hostname or "").lower()
        if host in YOUTUBE_HOSTS:
            # Let MarkItDown's YouTube path fetch the transcript (talks to
            # youtube.com only, already validated as public above).
            result = _md.convert_uri(url)
        else:
            # Fetch ourselves with redirect re-validation, then convert the
            # response — the narrowest path that keeps SSRF control on our side.
            with safe_get(url) as resp:
                resp.raise_for_status()
                result = _md.convert_response(resp)
    except UnsafeURLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except requests.exceptions.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else None
        detail = (
            f"The page returned HTTP {code} — it may require a login/subscription or block automated access."
            if code
            else "The page could not be fetched."
        )
        raise HTTPException(status_code=422, detail=detail) from exc
    except requests.exceptions.RequestException as exc:
        # Connection reset/timeout/DNS — typically anti-bot protection, a paywall,
        # or a transient network issue. Keep the message generic (don't leak internals).
        print(f"[convert-url] fetch failed for {url!r}: {exc!r}")
        raise HTTPException(
            status_code=422,
            detail="The site refused or dropped the connection. It likely blocks automated access, requires a subscription, or is temporarily unavailable.",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"[convert-url] conversion failed for {url!r}: {exc!r}")
        raise HTTPException(status_code=422, detail="This page could not be converted to Markdown.") from exc

    return ConvertResponse(markdown=result.markdown, title=result.title)
