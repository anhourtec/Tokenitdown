import { headers } from "next/headers"

import { buildAgentFile } from "@/lib/agent-files"
import { auth } from "@/lib/auth"
import { mcpPublicUrl } from "@/lib/mcp-url"

import { env } from "../../../../env.mjs"

export const runtime = "nodejs"

/**
 * Serves a per-instance agent instruction file (AGENTS.md / CLAUDE.md / skills.md)
 * as a download. The content is generated with this deployment's dashboard origin
 * and hosted MCP endpoint baked in.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name } = await params
  const u = new URL(env.BETTER_AUTH_URL)
  const file = buildAgentFile(name, {
    origin: u.origin,
    mcpUrl: mcpPublicUrl(),
  })
  if (!file) {
    return Response.json({ error: "Unknown file." }, { status: 404 })
  }

  return new Response(file.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
