import { env } from "../env.mjs"

/**
 * The public endpoint agents point at for the hosted (HTTP) MCP server, including
 * the trailing `/mcp` path.
 *
 * When `MCP_PUBLIC_URL` is set (e.g. a reverse-proxied subdomain such as
 * `https://mcp.example.com/mcp`) it is used verbatim. Otherwise we fall back to
 * the dashboard host with the MCP container's published port (`…:8001/mcp`) —
 * correct only when that port is reachable directly, which is not the case once
 * the server sits behind a reverse proxy.
 */
export function mcpPublicUrl(): string {
  if (env.MCP_PUBLIC_URL) return env.MCP_PUBLIC_URL
  const u = new URL(env.BETTER_AUTH_URL)
  return `${u.protocol}//${u.hostname}:8001/mcp`
}
