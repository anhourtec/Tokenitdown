import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDocument } from "@/lib/documents"
import { chunkByHeadings, detectChunkLevel } from "@/lib/markdown/chunk"

export const runtime = "nodejs"

/** RAG export: return the document's Markdown chunked by heading, with token counts. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const doc = await getDocument(id, session.user.id)
  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const level = new URL(req.url).searchParams.get("level")
  const auto = level === null || level === "auto"
  const maxLevel = auto
    ? detectChunkLevel(doc.markdown)
    : level === "1" || level === "3"
      ? Number(level)
      : 2

  const chunks = chunkByHeadings(doc.markdown, { maxLevel })
  return Response.json({ id: doc.id, title: doc.title, maxLevel, auto, chunks })
}
