"""TokenItDown MCP server — exposes document/URL → Markdown to AI coding agents.

This is the integration that lets a developer's agent (Claude Code, Cursor, VS Code
Copilot, Claude Desktop, …) call TokenItDown automatically: the moment a user points
the agent at a file or a web page, the agent calls one of these tools and gets back
clean, LLM-ready Markdown instead of raw bytes or HTML.

It runs in two modes, chosen by the ``TOKENITDOWN_MCP_HTTP`` env var:

  * **stdio** (default) — for local editors. The editor launches this as a
    subprocess and talks over stdin/stdout. Conversion happens in-process on the
    user's own machine, so it can read local files directly with no upload and no
    account::

        python -m app.mcp_server

  * **streamable HTTP** — for the hosted / self-hosted service, reachable by remote
    agents authenticated with a per-user API key. In this mode the tools **proxy to
    the web app's convert pipeline** (forwarding the agent's key), so the agent gets
    the same cleaned + token-counted Markdown a dashboard user does, the result is
    saved to that user's Library, and the conversion is attributed to the key — which
    powers the dashboard's per-key transparency view. See ``app/mcp_auth.py``::

        TOKENITDOWN_MCP_HTTP=1 TOKENITDOWN_WEB_URL=http://web:3000 \\
            MARKITDOWN_SERVICE_TOKEN=<secret> python -m app.mcp_server

Security boundary: the local-filesystem tool (``convert_file_to_markdown``) is
registered **only** in stdio mode. Over HTTP, where ``path`` would be an arbitrary
file read on the server, callers instead send the document's bytes as base64
(``convert_document``). URL conversion is SSRF-guarded in both modes.
"""

from __future__ import annotations

import base64
import binascii
import mimetypes
import os

import httpx
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_access_token

from . import conversion

HTTP_MODE = os.environ.get("TOKENITDOWN_MCP_HTTP") == "1"
HTTP_HOST = os.environ.get("TOKENITDOWN_MCP_HOST", "0.0.0.0")
HTTP_PORT = int(os.environ.get("TOKENITDOWN_MCP_PORT", "8001"))
# Optional static admin token. The normal auth path is per-user API keys validated
# against the web app (see below + app/mcp_auth.py).
MCP_TOKEN = os.environ.get("TOKENITDOWN_MCP_TOKEN", "")
# Where to validate per-user API keys: the web app's internal endpoint, reached
# over the compose network, gated by the shared MARKITDOWN_SERVICE_TOKEN.
WEB_URL = os.environ.get("TOKENITDOWN_WEB_URL", "").rstrip("/")
SERVICE_TOKEN = os.environ.get("MARKITDOWN_SERVICE_TOKEN", "")
VERIFY_URL = f"{WEB_URL}/api/mcp/verify" if WEB_URL else ""


def _build_auth():
    """Build the bearer-token verifier for HTTP mode, or None if unconfigured.

    Accepts a static admin token (TOKENITDOWN_MCP_TOKEN) and/or per-user API keys
    validated via the web app (TOKENITDOWN_WEB_URL + MARKITDOWN_SERVICE_TOKEN).
    """
    if not MCP_TOKEN and not (VERIFY_URL and SERVICE_TOKEN):
        return None
    from .mcp_auth import TokenItDownVerifier

    return TokenItDownVerifier(
        admin_token=MCP_TOKEN or None,
        verify_url=VERIFY_URL or None,
        service_token=SERVICE_TOKEN or None,
        required_scopes=["convert"],
    )


def _url_to_markdown(url: str) -> str:
    """Shared body for the URL tool (SSRF-guarded fetch → Markdown)."""
    try:
        return conversion.convert_url(url).markdown
    except (conversion.ConversionError, conversion.UnsafeURLError) as exc:
        raise ToolError(str(exc)) from exc


def _bytes_to_markdown(data: bytes, *, filename: str) -> str:
    mimetype, _ = mimetypes.guess_type(filename)
    try:
        return conversion.convert_bytes(data, filename=filename, mimetype=mimetype).markdown
    except conversion.ConversionError as exc:
        raise ToolError(str(exc)) from exc


# --- HTTP-mode proxy ----------------------------------------------------------
#
# In HTTP mode a request comes from a remote agent authenticated with its per-user
# API key. Rather than convert in-process, we forward to the web app's convert
# pipeline with that key, so the agent gets the SAME cleaned + token-counted
# Markdown a dashboard user does, the result is saved to their Library, and the
# conversion is attributed to their key (powering the dashboard's transparency
# view). The web app owns all that logic — we just proxy.

PROXY_TIMEOUT = 180.0


def _decode_base64(content_base64: str) -> bytes:
    try:
        return base64.b64decode(content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ToolError("content_base64 is not valid base64.") from exc


def _agent_token() -> str:
    """The verified API key the agent connected with (forwarded to the web app)."""
    token = get_access_token()
    if token is None or not token.token:
        raise ToolError("No API key on the request.")
    return token.token


def _web_result(resp: httpx.Response) -> str:
    if resp.status_code == 200:
        try:
            return resp.json().get("markdown", "") or ""
        except ValueError as exc:
            raise ToolError("The conversion service returned an unexpected response.") from exc
    # Surface the web app's user-safe error message when present.
    detail = None
    try:
        detail = resp.json().get("error")
    except ValueError:
        detail = None
    raise ToolError(detail or f"Conversion failed (HTTP {resp.status_code}).")


async def _web_convert_url(token: str, url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=PROXY_TIMEOUT) as client:
            resp = await client.post(
                f"{WEB_URL}/api/convert/url",
                headers={"Authorization": f"Bearer {token}"},
                json={"url": url},
            )
    except httpx.HTTPError as exc:
        raise ToolError("Could not reach the TokenItDown service.") from exc
    return _web_result(resp)


async def _web_convert_document(token: str, data: bytes, filename: str) -> str:
    mimetype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    try:
        async with httpx.AsyncClient(timeout=PROXY_TIMEOUT) as client:
            resp = await client.post(
                f"{WEB_URL}/api/convert",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": (filename, data, mimetype)},
            )
    except httpx.HTTPError as exc:
        raise ToolError("Could not reach the TokenItDown service.") from exc
    return _web_result(resp)


def build_server(*, http: bool = False) -> FastMCP:
    """Construct the MCP server, registering the tools appropriate for the mode.

    ``http=True`` adds bearer-token auth (per-user API keys and/or a static admin
    token) and swaps the local-file tool for the base64 upload tool.
    """
    auth = _build_auth() if http else None

    mcp = FastMCP(
        name="TokenItDown",
        instructions=(
            "TokenItDown turns documents and web pages into clean, LLM-ready "
            "Markdown. Call these tools whenever the user references a file or a URL "
            "you need to read, summarize, quote, or extract from — the Markdown they "
            "return is far cheaper and more accurate to reason over than raw bytes "
            "or HTML."
        ),
        auth=auth,
    )

    if http:

        @mcp.tool
        async def convert_url_to_markdown(url: str) -> str:
            """Convert a web page or online document into clean, LLM-ready Markdown.

            Use this whenever the user gives you an http(s) URL — an article, blog
            post, documentation page, Wikipedia entry, YouTube video (returns the
            transcript), RSS feed, or a link to a PDF/Office file — and wants its
            contents read, summarized, quoted, compared, or analyzed.

            Prefer this over fetching the URL yourself: it strips navigation, ads,
            scripts, and boilerplate and returns only the meaningful content as
            Markdown, which is cheaper and more accurate to reason over than raw HTML.

            Args:
                url: The full http(s) URL to convert.

            Returns:
                The page's content as Markdown.
            """
            return await _web_convert_url(_agent_token(), url)

        @mcp.tool
        async def convert_document(content_base64: str, filename: str) -> str:
            """Convert an uploaded document into clean, LLM-ready Markdown.

            Use this to read a file the user has provided as raw bytes. Supports PDF,
            Word (.docx), PowerPoint (.pptx), Excel (.xlsx)/CSV, images, audio, EPUB,
            HTML, JSON, ZIP, Outlook (.msg) and more.

            Args:
                content_base64: The file's bytes, base64-encoded.
                filename: Original filename including its extension — used to pick the
                    correct parser (e.g. "report.pdf").

            Returns:
                The document's content as Markdown.
            """
            data = _decode_base64(content_base64)
            return await _web_convert_document(_agent_token(), data, filename or "upload")

    else:

        @mcp.tool
        def convert_url_to_markdown(url: str) -> str:
            """Convert a web page or online document into clean, LLM-ready Markdown.

            Use this whenever the user gives you an http(s) URL — an article, blog
            post, documentation page, Wikipedia entry, YouTube video (returns the
            transcript), RSS feed, or a link to a PDF/Office file — and wants its
            contents read, summarized, quoted, compared, or analyzed.

            Prefer this over fetching the URL yourself: it strips navigation, ads,
            scripts, and boilerplate and returns only the meaningful content as
            Markdown, which is cheaper and more accurate to reason over than raw HTML.

            Args:
                url: The full http(s) URL to convert.

            Returns:
                The page's content as Markdown.
            """
            return _url_to_markdown(url)

        @mcp.tool
        def convert_file_to_markdown(path: str) -> str:
            """Convert a local file on the user's machine into clean, LLM-ready Markdown.

            Use this whenever the user points you at a document on disk — PDF, Word
            (.docx), PowerPoint (.pptx), Excel (.xlsx)/CSV, images, audio, EPUB, HTML,
            JSON, ZIP, Outlook (.msg) and more — and wants its contents read,
            summarized, searched, or extracted. It returns the document's text as
            Markdown so you can reason over it directly, without the user copy-pasting
            anything.

            Always prefer this to guessing a binary file's contents from its name.

            Args:
                path: Absolute or working-directory-relative path to the file.

            Returns:
                The file's content as Markdown.
            """
            resolved = os.path.expanduser(path)
            if not os.path.isfile(resolved):
                raise ToolError(f"No file found at {path!r}.")
            if os.path.getsize(resolved) > conversion.MAX_UPLOAD_BYTES:
                raise ToolError("File exceeds the maximum allowed size.")
            try:
                with open(resolved, "rb") as fh:
                    data = fh.read()
            except OSError as exc:
                raise ToolError(f"Could not read {path!r}.") from exc
            return _bytes_to_markdown(data, filename=os.path.basename(resolved))

    return mcp


mcp = build_server(http=HTTP_MODE)


def main() -> None:
    if HTTP_MODE:
        if mcp.auth is None:
            # Fail loud rather than expose an unauthenticated conversion endpoint.
            raise SystemExit(
                "HTTP mode needs auth. Set per-user key validation "
                "(TOKENITDOWN_WEB_URL + MARKITDOWN_SERVICE_TOKEN) and/or a static "
                "TOKENITDOWN_MCP_TOKEN — an HTTP MCP server without auth is an open proxy."
            )
        if not WEB_URL:
            # HTTP-mode tools proxy conversions to the web app's pipeline.
            raise SystemExit("HTTP mode requires TOKENITDOWN_WEB_URL (the web app's base URL).")
        mcp.run(transport="http", host=HTTP_HOST, port=HTTP_PORT)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
