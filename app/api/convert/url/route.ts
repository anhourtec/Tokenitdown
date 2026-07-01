import { headers } from "next/headers"

import { resolveRequestUser } from "@/lib/api-keys"
import { auth } from "@/lib/auth"
import { saveDocument } from "@/lib/documents"
import { cleanMarkdown } from "@/lib/markdown/clean"
import { tokenSavings } from "@/lib/markdown/tokens"
import { ConversionError, convertUrl } from "@/lib/markitdown-client"
import { getPreferences } from "@/lib/preferences"

export const runtime = "nodejs"

async function sessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user.id ?? null
}

export async function POST(req: Request) {
  // Either a dashboard session or an agent's API key (tagged onto the document).
  const actor = await resolveRequestUser(req, sessionUserId)
  if (!actor) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown; tier?: unknown } | null
  const url = typeof body?.url === "string" ? body.url.trim() : ""
  if (!url) {
    return Response.json({ error: "A 'url' is required." }, { status: 400 })
  }

  const prefs = await getPreferences(actor.userId)
  const tier = body?.tier === "compact" ? "compact" : body?.tier === "clean" ? "clean" : prefs.defaultCleanTier

  try {
    const { markdown: raw, title } = await convertUrl(url)
    // Web sources also get nav/footer/cookie chrome stripped.
    const { markdown, stats } = cleanMarkdown(raw, tier, { web: true })
    const tokens = tokenSavings(raw, markdown)
    const doc = await saveDocument({
      userId: actor.userId,
      apiKeyId: actor.apiKeyId,
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
