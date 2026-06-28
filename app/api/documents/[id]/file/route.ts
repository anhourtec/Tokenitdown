import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDocumentFile } from "@/lib/documents"

export const runtime = "nodejs"

/** Serve the stored original file for a document (auth-gated, owner-scoped). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const file = await getDocumentFile(id, session.user.id)
  if (!file) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Sanitize filename for the Content-Disposition header.
  const safeName = file.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "document"
  const mime = (file.mimetype || "").toLowerCase()

  // Only render bytes inline for types the browser displays safely. HTML and SVG
  // can execute scripts in our origin, so those (and everything else) download.
  const inlineSafe = mime === "application/pdf" || (mime.startsWith("image/") && mime !== "image/svg+xml")

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": inlineSafe ? file.mimetype! : "application/octet-stream",
      "Content-Disposition": `${inlineSafe ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
