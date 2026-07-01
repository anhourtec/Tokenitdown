"use client"

import { FileText, Globe, Upload } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { AgentFilesCard } from "./agent-files-card"
import { ApiKeysPanel } from "./api-keys-panel"
import { CodeBlock } from "./code-block"

interface AgentFile {
  name: string
  title: string
  description: string
}

interface Editor {
  id: string
  name: string
  /** Heading shown above the snippet. */
  snippetLabel: string
  snippet: string
  /** Where the config lives / how it's applied. */
  hint: React.ReactNode
}

function editors(): Editor[] {
  // stdio config — the local, no-account path. Pointed at the processing
  // service's MCP entrypoint; run from `server/` with its deps installed.
  const jsonStdio = (rootKey: "mcpServers" | "servers", extra = "") =>
    `{
  "${rootKey}": {
    "tokenitdown": {${extra}
      "command": "python",
      "args": ["-m", "app.mcp_server"]
    }
  }
}`

  return [
    {
      id: "claude-code",
      name: "Claude Code",
      snippetLabel: "Run in your terminal",
      snippet: "claude mcp add tokenitdown -- python -m app.mcp_server",
      hint: (
        <>
          Run from the <code className="font-mono">server/</code> directory (where the MCP package
          is importable). Verify with <code className="font-mono">claude mcp list</code>.
        </>
      ),
    },
    {
      id: "cursor",
      name: "Cursor",
      snippetLabel: "~/.cursor/mcp.json",
      snippet: jsonStdio("mcpServers"),
      hint: "Add to the global ~/.cursor/mcp.json (or a per-project .cursor/mcp.json), then reload.",
    },
    {
      id: "vscode",
      name: "VS Code",
      snippetLabel: ".vscode/mcp.json",
      snippet: jsonStdio("servers", '\n      "type": "stdio",'),
      hint: "VS Code Copilot uses the top-level \"servers\" key. Reload the window to pick it up.",
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      snippetLabel: "claude_desktop_config.json",
      snippet: jsonStdio("mcpServers"),
      hint: "Settings → Developer → Edit Config. Restart Claude Desktop after saving.",
    },
  ]
}

const TOOLS = [
  {
    icon: Globe,
    name: "convert_url_to_markdown",
    desc: "Any web page or online document — article, docs page, Wikipedia, YouTube (transcript), or a PDF/Office link — fetched and returned as clean Markdown.",
  },
  {
    icon: FileText,
    name: "convert_file_to_markdown",
    desc: "A local file on your machine — PDF, Word, PowerPoint, Excel/CSV, images, audio, EPUB, JSON, ZIP and more — read straight from disk. (Local/stdio only.)",
  },
  {
    icon: Upload,
    name: "convert_document",
    desc: "An uploaded file's bytes converted to Markdown over the hosted endpoint, when the agent isn't running on the same machine as the file.",
  },
]

export function ConnectClient({ mcpUrl, agentFiles }: { mcpUrl: string; agentFiles: AgentFile[] }) {
  const list = React.useMemo(editors, [])
  const [active, setActive] = React.useState(() => list[0]?.id ?? "")
  const editor = list.find((e) => e.id === active)
  if (!editor) return null

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {/* Install (local / stdio) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Install in your editor</CardTitle>
          <CardDescription>
            Runs locally and converts your own files in place — no upload, no account needed.
            Pick your editor:
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Editors">
            {list.map((e) => (
              <Button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={e.id === active}
                variant={e.id === active ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActive(e.id)}
                className={cn(e.id === active && "ring-1 ring-foreground/10")}
              >
                {e.name}
              </Button>
            ))}
          </div>
          <CodeBlock code={editor.snippet} label={editor.snippetLabel} />
          <p className="text-muted-foreground text-xs">{editor.hint}</p>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What your agent can do</CardTitle>
          <CardDescription>Three tools become available to the model:</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {TOOLS.map((t) => (
            <div key={t.name} className="flex items-start gap-3 border-t pt-3 first:border-t-0 first:pt-0">
              <t.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <code className="font-mono text-sm">{t.name}</code>
                <span className="text-muted-foreground text-xs">{t.desc}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hosted access, per-user keys, and per-key usage/transparency */}
      <ApiKeysPanel mcpUrl={mcpUrl} />

      {/* Drop-in instruction files for any agent — preview inline + download */}
      <AgentFilesCard files={agentFiles} />
    </div>
  )
}
