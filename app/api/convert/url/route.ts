import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { saveDocument } from "@/lib/documents"
import { cleanMarkdown } from "@/lib/markdown/clean"
import { tokenSavings } from "@/lib/markdown/tokens"
import { ConversionError, convertUrl } from "@/lib/markitdown-client"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown; tier?: unknown } | null
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  const tier = body?.tier === "compact" ? "compact" : "clean"
  if (!url) {
    return Response.json({ error: "A 'url' is required." }, { status: 400 })
  }

  try {
    const { markdown: raw, title } = await convertUrl(url)
    // Web sources also get nav/footer/cookie chrome stripped.
    const { markdown, stats } = cleanMarkdown(raw, tier, { web: true })
    const tokens = tokenSavings(raw, markdown)
    const doc = await saveDocument({
      userId: session.user.id,
      title,
      sourceType: "url",
      sourceName: url,
      mimetype: null,
      markdown,
      markdownRaw: raw,
      cleanTier: tier,
      rawTokens: tokens.rawTokens,
      cleanTokens: tokens.cleanTokens,
      cleanStats: stats,
      original: null,
    })
    return Response.json({ id: doc.id, title: doc.title, markdown, tokens, cleanStats: stats })
  } catch (err) {
    if (err instanceof ConversionError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    console.error("convert-url: unexpected error", err)
    return Response.json({ error: "Conversion failed." }, { status: 500 })
  }
}
