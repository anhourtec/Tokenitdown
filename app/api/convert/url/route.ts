import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { saveDocument } from "@/lib/documents"
import { ConversionError, convertUrl } from "@/lib/markitdown-client"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!url) {
    return Response.json({ error: "A 'url' is required." }, { status: 400 })
  }

  try {
    const { markdown, title } = await convertUrl(url)
    const doc = await saveDocument({
      userId: session.user.id,
      title,
      sourceType: "url",
      sourceName: url,
      mimetype: null,
      markdown,
      original: null,
    })
    return Response.json({ id: doc.id, title: doc.title, markdown })
  } catch (err) {
    if (err instanceof ConversionError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    console.error("convert-url: unexpected error", err)
    return Response.json({ error: "Conversion failed." }, { status: 500 })
  }
}
