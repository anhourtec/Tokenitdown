import { timingSafeEqual } from "crypto"

import { verifyApiKey } from "@/lib/api-keys"

import { env } from "../../../../env.mjs"

export const runtime = "nodejs"

/** Constant-time string compare that doesn't leak length via early return. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Internal endpoint used by the Python MCP server (`markitdown-mcp`) to validate
 * a presented per-user API key. The caller authenticates with the shared
 * MARKITDOWN_SERVICE_TOKEN (same secret the web app uses to reach the converter);
 * the end-user's key travels in the JSON body. Returns the owning userId on
 * success, 401 otherwise. Not for browser use.
 */
export async function POST(req: Request) {
  const serviceToken = req.headers.get("x-service-token")
  if (!serviceToken || !safeEqual(serviceToken, env.MARKITDOWN_SERVICE_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { key?: unknown } | null
  const key = typeof body?.key === "string" ? body.key : ""
  if (!key) {
    return Response.json({ error: "Missing key." }, { status: 400 })
  }

  const result = await verifyApiKey(key)
  if (!result) {
    return Response.json({ error: "Invalid key." }, { status: 401 })
  }
  return Response.json({ userId: result.userId })
}
