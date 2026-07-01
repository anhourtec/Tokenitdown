import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { agentFileList } from "@/lib/agent-files"
import { auth } from "@/lib/auth"
import { mcpPublicUrl } from "@/lib/mcp-url"

import { ConnectClient } from "./_components/connect-client"

export const metadata = {
  title: "Connect your editor · TokenItDown",
}

export default async function ConnectPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  // The hosted MCP endpoint: MCP_PUBLIC_URL when set (e.g. a reverse-proxied
  // subdomain), else derived from the dashboard host + the container's port.
  const mcpUrl = mcpPublicUrl()

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
