import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getPreferences, updatePreferences, type UserPreferences } from "@/lib/preferences"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return Response.json(await getPreferences(session.user.id))
}

export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Partial<UserPreferences> | null
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body." }, { status: 400 })
  }

  // Only known keys are passed through; updatePreferences validates the values.
  const patch: Partial<UserPreferences> = {}
  if ("defaultCleanTier" in body) patch.defaultCleanTier = body.defaultCleanTier
  if ("defaultChunkLevel" in body) patch.defaultChunkLevel = body.defaultChunkLevel
  if ("storeOriginals" in body) patch.storeOriginals = Boolean(body.storeOriginals)

  const prefs = await updatePreferences(session.user.id, patch)
  return Response.json(prefs)
}
