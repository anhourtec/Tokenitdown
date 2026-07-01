"""Bearer-token verification for the HTTP MCP server.

Two kinds of token are accepted:

  * **Per-user API keys** (the normal path) — minted in the dashboard and stored
    hashed in the web app's database. We validate one by POSTing it to the web
    app's internal ``/api/mcp/verify`` endpoint (authenticated with the shared
    ``MARKITDOWN_SERVICE_TOKEN``); on success it returns the owning ``userId``.
  * **A static admin token** (optional escape hatch) — ``TOKENITDOWN_MCP_TOKEN``.
    Useful for smoke tests or a single-tenant box without accounts.

Keeping key storage in the web app (which owns the database) means this Python
service stays stateless and needs no DB driver or schema knowledge.
"""

from __future__ import annotations

import hmac

import httpx
from fastmcp.server.auth.auth import AccessToken, TokenVerifier

CONVERT_SCOPE = "convert"


class TokenItDownVerifier(TokenVerifier):
    """Verifies static admin tokens locally and per-user API keys via the web app."""

    def __init__(
        self,
        *,
        admin_token: str | None = None,
        verify_url: str | None = None,
        service_token: str | None = None,
        required_scopes: list[str] | None = None,
        timeout: float = 10.0,
    ) -> None:
        super().__init__(required_scopes=required_scopes)
        self.admin_token = admin_token or None
        self.verify_url = verify_url or None
        self.service_token = service_token or None
        self.timeout = timeout

    async def verify_token(self, token: str) -> AccessToken | None:
        if not token:
            return None

        # Static admin token (constant-time compare).
        if self.admin_token and hmac.compare_digest(token, self.admin_token):
            return AccessToken(token=token, client_id="admin", scopes=[CONVERT_SCOPE])

        # Per-user API key — validate against the web app.
        if self.verify_url and self.service_token:
            user_id = await self._verify_with_web(token)
            if user_id:
                return AccessToken(token=token, client_id=user_id, scopes=[CONVERT_SCOPE])

        return None

    async def _verify_with_web(self, token: str) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    self.verify_url,
                    headers={"X-Service-Token": self.service_token or ""},
                    json={"key": token},
                )
        except httpx.HTTPError as exc:  # network/timeout — treat as unverified
            print(f"[mcp-auth] verify request failed: {exc!r}")
            return None

        if resp.status_code != 200:
            return None
        try:
            user_id = resp.json().get("userId")
        except ValueError:
            return None
        return user_id if isinstance(user_id, str) and user_id else None
