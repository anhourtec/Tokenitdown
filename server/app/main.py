"""TokenItDown processing service — a thin FastAPI wrapper around MarkItDown.

The service is internal-only (no published port in docker-compose) and gated by a
shared secret (``MARKITDOWN_SERVICE_TOKEN``) sent by the Next.js app. It exposes:

  GET  /health       liveness probe (unauthenticated)
  POST /convert      multipart file upload -> Markdown (uses convert_stream)
  POST /convert-url  JSON {url} -> Markdown (SSRF-guarded; YouTube + web pages)

The conversion itself lives in :mod:`app.conversion`, shared with the MCP server.
"""

from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

from . import conversion
from .conversion import (
    MAX_UPLOAD_BYTES,
    ConversionError,
    EmptyInputError,
    OversizeError,
    UnsafeURLError,
)

SERVICE_TOKEN = os.environ.get("MARKITDOWN_SERVICE_TOKEN", "")

app = FastAPI(
    title="TokenItDown processing service",
    # No interactive docs / OpenAPI schema — this is a private machine endpoint.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


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
    try:
        result = conversion.convert_bytes(
            data,
            filename=file.filename or "upload",
            mimetype=file.content_type,
            max_bytes=MAX_UPLOAD_BYTES,
        )
    except OversizeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except EmptyInputError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.") from exc
    except ConversionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ConvertResponse(markdown=result.markdown, title=result.title)


@app.post("/convert-url", response_model=ConvertResponse, dependencies=[Depends(require_token)])
def convert_url(req: UrlRequest) -> ConvertResponse:
    try:
        result = conversion.convert_url(req.url)
    except (UnsafeURLError, EmptyInputError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConversionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ConvertResponse(markdown=result.markdown, title=result.title)
