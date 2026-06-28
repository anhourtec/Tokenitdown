import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { deleteDocument, getDocument } from "@/lib/documents"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const doc = await getDocument(id, session.user.id)
  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({
    id: doc.id,
    title: doc.title,
    sourceType: doc.sourceType,
    sourceName: doc.sourceName,
    mimetype: doc.mimetype,
    sizeBytes: doc.sizeBytes,
    createdAt: doc.createdAt,
    markdown: doc.markdown,
    cleanTier: doc.cleanTier,
    rawTokens: doc.rawTokens,
    cleanTokens: doc.cleanTokens,
    cleanStats: doc.cleanStats,
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const ok = await deleteDocument(id, session.user.id)
  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }
  return Response.json({ ok: true })
}
