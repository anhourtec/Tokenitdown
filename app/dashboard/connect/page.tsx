import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { agentFileList } from "@/lib/agent-files"
import { auth } from "@/lib/auth"

import { ConnectClient } from "./_components/connect-client"
import { env } from "../../../env.mjs"

export const metadata = {
  title: "Connect your editor · TokenItDown",
}

export default async function ConnectPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  // The hosted MCP endpoint: same host as the dashboard, on the MCP container's
  // published port (8001 by default — see docker-compose `markitdown-mcp`).
  const u = new URL(env.BETTER_AUTH_URL)
  const mcpUrl = `${u.protocol}//${u.hostname}:8001/mcp`

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Connect your editor</h2>
        <p className="text-muted-foreground text-sm">
          Add TokenItDown to your AI coding agent. The moment you hand it a file or a URL, it
          calls TokenItDown and gets clean, LLM-ready Markdown back — no copy-pasting.
        </p>
      </div>
      <ConnectClient mcpUrl={mcpUrl} agentFiles={agentFileList()} />
    </div>
  )
}
