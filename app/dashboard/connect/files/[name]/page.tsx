import { ArrowLeft, Download } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/ui/markdown"
import { buildAgentFile } from "@/lib/agent-files"
import { auth } from "@/lib/auth"

import { env } from "../../../../../env.mjs"

export const metadata = {
  title: "Agent file · TokenItDown",
}

export default async function AgentFilePage({ params }: { params: Promise<{ name: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { name } = await params
  const u = new URL(env.BETTER_AUTH_URL)
  const file = buildAgentFile(name, {
    origin: u.origin,
    mcpUrl: `${u.protocol}//${u.hostname}:8001/mcp`,
  })
  if (!file) notFound()

  return (
    <div className="@container/main flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/connect">
            <ArrowLeft className="size-4" />
            Back to Connect
          </Link>
        </Button>
        <h2 className="font-mono font-semibold text-lg">{file.filename}</h2>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={`/api/agent-files/${encodeURIComponent(file.filename)}`} download={file.filename}>
            <Download className="size-4" />
            Download
          </a>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">{file.description}</p>
      {/* GitHub-style full-width rendered Markdown */}
      <div className="rounded-xl border bg-card p-6 md:p-8">
        <Markdown content={file.content} />
      </div>
    </div>
  )
}
