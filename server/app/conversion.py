"""Shared document/URL → Markdown conversion core.

Both the HTTP API (``app.main``) and the MCP server (``app.mcp_server``) call into
this module so there is a single, security-reviewed conversion path. Functions
raise the typed :class:`ConversionError` subclasses below; each caller maps them to
its own surface (HTTP status codes, MCP tool errors).

Per MarkItDown's security guidance we use the narrowest API for each case:
``convert_stream`` for in-memory bytes (never touches the filesystem/network) and a
SSRF-guarded fetch for URLs (see :mod:`app.security`).
"""

from __future__ import annotations

import io
import os
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from markitdown import MarkItDown, StreamInfo

from .security import UnsafeURLError, assert_safe_url, safe_get

# 50 MB default ceiling; override with MAX_UPLOAD_BYTES.
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
}

# A single converter instance is reused across calls. Plugins are disabled so only
# vetted built-in converters run.
_md = MarkItDown(enable_plugins=False)


@dataclass
class Conversion:
    """Result of a successful conversion."""

    markdown: str
    title: str | None = None


class ConversionError(Exception):
    """Base class for conversion failures, carrying a user-safe message."""


class EmptyInputError(ConversionError):
    """The input had no content to convert."""


class OversizeError(ConversionError):
    """The input exceeded the maximum allowed size."""


class FetchError(ConversionError):
    """A URL could not be retrieved (HTTP error, timeout, refused connection)."""


class UnsupportedContentError(ConversionError):
    """The content could not be parsed into Markdown."""


# Re-exported so callers can catch the SSRF rejection alongside ConversionError
# without reaching into app.security.
__all__ = [
    "Conversion",
    "ConversionError",
    "EmptyInputError",
    "OversizeError",
    "FetchError",
    "UnsupportedContentError",
    "UnsafeURLError",
    "MAX_UPLOAD_BYTES",
    "convert_bytes",
    "convert_url",
]


def convert_bytes(
    data: bytes,
    *,
    filename: str,
    mimetype: str | None = None,
    max_bytes: int = MAX_UPLOAD_BYTES,
) -> Conversion:
    """Convert in-memory file bytes to Markdown.

    Raises :class:`OversizeError`, :class:`EmptyInputError`, or
    :class:`UnsupportedContentError`.
    """
    if len(data) > max_bytes:
        raise OversizeError("File exceeds the maximum allowed size.")
    if not data:
        raise EmptyInputError("Input is empty.")

    extension = os.path.splitext(filename)[1] or None
    stream_info = StreamInfo(
        filename=filename,
        extension=extension,
        mimetype=mimetype or None,
    )

    try:
        result = _md.convert_stream(io.BytesIO(data), stream_info=stream_info)
    except Exception as exc:  # noqa: BLE001 — any converter failure is a 422-class error
        print(f"[convert] conversion failed for {filename!r}: {exc!r}")
        raise UnsupportedContentError(
            "This file could not be converted — it may be corrupted, "
            "password-protected, or an unsupported format."
        ) from exc

    return Conversion(markdown=result.markdown, title=result.title)


def convert_url(url: str) -> Conversion:
    """Fetch a URL (SSRF-guarded) and convert it to Markdown.

    Raises :class:`UnsafeURLError`, :class:`EmptyInputError`, :class:`FetchError`,
    or :class:`UnsupportedContentError`.
    """
    url = url.strip()
    if not url:
        raise EmptyInputError("URL is required.")

    assert_safe_url(url)  # raises UnsafeURLError before any network I/O
    host = (urlparse(url).hostname or "").lower()

    try:
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
    except UnsafeURLError:
        raise
    except requests.exceptions.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else None
        detail = (
            f"The page returned HTTP {code} — it may require a login/subscription "
            "or block automated access."
            if code
            else "The page could not be fetched."
        )
        raise FetchError(detail) from exc
    except requests.exceptions.RequestException as exc:
        # Connection reset/timeout/DNS — typically anti-bot protection, a paywall,
        # or a transient network issue. Keep the message generic (don't leak internals).
        print(f"[convert-url] fetch failed for {url!r}: {exc!r}")
        raise FetchError(
            "The site refused or dropped the connection. It likely blocks automated "
            "access, requires a subscription, or is temporarily unavailable."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        print(f"[convert-url] conversion failed for {url!r}: {exc!r}")
        raise UnsupportedContentError("This page could not be converted to Markdown.") from exc

    return Conversion(markdown=result.markdown, title=result.title)
