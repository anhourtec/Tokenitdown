import { headers } from "next/headers"

import { resolveRequestUser } from "@/lib/api-keys"
import { auth } from "@/lib/auth"
import { saveDocument } from "@/lib/documents"
import { cleanMarkdown } from "@/lib/markdown/clean"
import { tokenSavings } from "@/lib/markdown/tokens"
import { ConversionError, convertFile } from "@/lib/markitdown-client"
import { getPreferences } from "@/lib/preferences"

import { env } from "../../../env.mjs"

// Needs the Node runtime: reads the upload into a Buffer and writes the original
// to disk via lib/documents.
export const runtime = "nodejs"

async function sessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user.id ?? null
}

export async function POST(req: Request) {
  // Accept either a logged-in session (dashboard) or an API key (an AI agent via
  // the MCP server). When it's a key, the saved document is tagged with it.
  const actor = await resolveRequestUser(req, sessionUserId)
  if (!actor) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "Expected multipart/form-data with a 'file' field." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 })
  }
  if (file.size === 0) {
    return Response.json({ error: "The uploaded file is empty." }, { status: 400 })
  }
  if (file.size > env.MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File exceeds the ${Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit.` },
      { status: 413 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const prefs = await getPreferences(actor.userId)
  // Explicit ?tier wins (API callers); otherwise use the user's saved default.
  const formTier = form.get("tier")
  const tier = formTier === "compact" ? "compact" : formTier === "clean" ? "clean" : prefs.defaultCleanTier

  try {
    const { markdown: raw, title } = await convertFile(bytes, file.name, file.type)
    const { markdown, stats } = cleanMarkdown(raw, tier)
    const tokens = tokenSavings(raw, markdown)
    const doc = await saveDocument({
      userId: actor.userId,
      apiKeyId: actor.apiKeyId,
      title,
      sourceType: "file",
      sourceName: file.name || "upload",
      mimetype: file.type || null,
      markdown,
      markdownRaw: raw,
      cleanTier: tier,
      rawTokens: tokens.rawTokens,
      cleanTokens: tokens.cleanTokens,
      cleanStats: stats,
      // Always persist the original; `storeOriginals` only controls whether it's
      // shown on the dashboard (see the Documents page).
      original: { bytes, filename: file.name || "upload" },
    })
    return Response.json({ id: doc.id, title: doc.title, markdown, tokens, cleanStats: stats })
  } catch (err) {
    if (err instanceof ConversionError) {
      return Response.json({ error: err.message }, { status: err.status })
    }
    console.error("convert: unexpected error", err)
    return Response.json({ error: "Conversion failed." }, { status: 500 })
  }
}
