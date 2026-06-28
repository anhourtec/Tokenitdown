import { headers } from "next/headers"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { auth } from "@/lib/auth"

import { env } from "../../../../env.mjs"

export const runtime = "nodejs"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

function safeId(id: string): string | null {
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : null
}

function avatarPath(userId: string): string {
  return path.join(env.STORAGE_DIR, "avatars", userId)
}

/** Sniff the image type from magic bytes so GET can serve a correct Content-Type. */
function sniff(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png"
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "GIF8") return "image/gif"
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp"
  return "application/octet-stream"
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const id = safeId(session.user.id)
  if (!id) return Response.json({ error: "Invalid account." }, { status: 400 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "Expected multipart/form-data with a 'file' field." }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) return Response.json({ error: "No image provided." }, { status: 400 })
  if (!ALLOWED.has(file.type)) return Response.json({ error: "Use a PNG, JPEG, WEBP or GIF image." }, { status: 415 })
  if (file.size > MAX_AVATAR_BYTES) return Response.json({ error: "Image must be 2 MB or smaller." }, { status: 413 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const abs = avatarPath(id)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, bytes)
  return Response.json({ ok: true })
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const id = safeId(session.user.id)
  if (!id) return new Response(null, { status: 404 })

  try {
    const bytes = await readFile(avatarPath(id))
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": sniff(bytes),
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
