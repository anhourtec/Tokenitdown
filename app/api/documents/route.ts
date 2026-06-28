import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { listDocuments } from "@/lib/documents"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const documents = await listDocuments(session.user.id)
  return Response.json({ documents })
}
