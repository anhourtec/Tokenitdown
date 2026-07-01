import { headers } from "next/headers"

import { listKeyConversions, revokeApiKey } from "@/lib/api-keys"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  return Response.json({ conversions: await listKeyConversions(session.user.id, id) })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const ok = await revokeApiKey(session.user.id, id)
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({ ok: true })
}
