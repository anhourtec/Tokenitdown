import { headers } from "next/headers"

import { createApiKey, listApiKeysWithUsage } from "@/lib/api-keys"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return Response.json({ keys: await listApiKeysWithUsage(session.user.id) })
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  if (!name) {
    return Response.json({ error: "A key name is required." }, { status: 400 })
  }
  if (name.length > 60) {
    return Response.json({ error: "Key name is too long (max 60 characters)." }, { status: 400 })
  }

  // The token is returned exactly once — the client must show it immediately.
  const { token, key } = await createApiKey(session.user.id, name)
  return Response.json({ token, key }, { status: 201 })
}
