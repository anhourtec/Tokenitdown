import { Download, FileCode2, SquareArrowOutUpRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AgentFile {
  name: string
  title: string
  description: string
}

export function AgentFilesCard({ files }: { files: AgentFile[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Drop-in files for your project</CardTitle>
        <CardDescription>
          Add one of these to your repo so any agent — Claude Code, Codex, Cursor, Gemini, Windsurf,
          or any MCP host — knows to use TokenItDown when handed a file or URL. Open one to read it
          full-page, then download. Each is generated with this instance&rsquo;s endpoint baked in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {files.map((f) => (
          <div
            key={f.name}
            className="flex flex-wrap items-center gap-3 border-t pt-2 first:border-t-0 first:pt-0"
          >
            <FileCode2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <code className="font-mono text-sm">{f.title}</code>
              <span className="text-muted-foreground text-xs">{f.description}</span>
            </div>
            <div className="ml-auto flex shrink-0 gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/connect/files/${encodeURIComponent(f.name)}`}>
                  <SquareArrowOutUpRight className="size-4" />
                  Open
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/agent-files/${encodeURIComponent(f.name)}`} download={f.name}>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
