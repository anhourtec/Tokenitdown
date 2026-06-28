import { env } from "../env.mjs"

export interface ConversionResult {
  markdown: string
  title: string | null
}

/**
 * Error talking to the processing service. `status` is the HTTP status to return
 * to the browser: 4xx from the service (bad URL, too large, unsupported format)
 * is passed through; anything else becomes 502 (bad gateway).
 */
export class ConversionError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = "ConversionError"
    this.status = status
  }
}

function authHeaders(): Record<string, string> {
  return { "X-Service-Token": env.MARKITDOWN_SERVICE_TOKEN }
}

async function parse(resp: Response): Promise<ConversionResult> {
  if (!resp.ok) {
    let detail = `Conversion service error (${resp.status})`
    try {
      const body = (await resp.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      // non-JSON error body — keep the generic message
    }
    const status = resp.status >= 400 && resp.status < 500 ? resp.status : 502
    throw new ConversionError(detail, status)
  }
  const body = (await resp.json()) as { markdown?: string; title?: string | null }
  return { markdown: body.markdown ?? "", title: body.title ?? null }
}

/** Convert uploaded bytes to Markdown via the processing service. */
export async function convertFile(
  bytes: Buffer,
  filename: string,
  mimetype: string
): Promise<ConversionResult> {
  const form = new FormData()
  // new Uint8Array(bytes) yields a non-shared ArrayBuffer-backed view (BlobPart).
  const blob = new Blob([new Uint8Array(bytes)], { type: mimetype || "application/octet-stream" })
  form.append("file", blob, filename || "upload")

  let resp: Response
  try {
    resp = await fetch(`${env.MARKITDOWN_SERVICE_URL}/convert`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    })
  } catch (err) {
    throw new ConversionError(`Could not reach the conversion service: ${(err as Error).message}`)
  }
  return parse(resp)
}

/** Convert a URL (web page or YouTube) to Markdown via the processing service. */
export async function convertUrl(url: string): Promise<ConversionResult> {
  let resp: Response
  try {
    resp = await fetch(`${env.MARKITDOWN_SERVICE_URL}/convert-url`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
  } catch (err) {
    throw new ConversionError(`Could not reach the conversion service: ${(err as Error).message}`)
  }
  return parse(resp)
}
