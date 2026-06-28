"use client"

import { Check, Copy, Download, FileText, Loader2, Search } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DocSummary {
  id: string
  title: string
  sourceName: string
}

interface Chunk {
  index: number
  heading: string | null
  text: string
  tokens: number
}

const LEVELS = [
  { value: "auto", label: "Auto" },
  { value: "1", label: "By H1 only" },
  { value: "2", label: "By H1 + H2" },
  { value: "3", label: "By H1–H3" },
]

const LEVEL_LABEL: Record<number, string> = { 1: "H1", 2: "H1 + H2", 3: "H1–H3" }

export function RagClient() {
  const [docs, setDocs] = React.useState<DocSummary[] | null>(null)
  const [docQuery, setDocQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState<string>("")
  const [level, setLevel] = React.useState<string>("auto")
  const [chunks, setChunks] = React.useState<Chunk[] | null>(null)
  const [detected, setDetected] = React.useState<{ maxLevel: number; auto: boolean } | null>(null)
  const [title, setTitle] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [filter, setFilter] = React.useState("")

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/documents")
        const body = (await res.json()) as { documents?: DocSummary[]; error?: string }
        if (!res.ok) throw new Error(body?.error ?? "Failed to load documents")
        const list = body.documents ?? []
        setDocs(list)
        if (list[0]) setSelectedId(list[0].id)
      } catch (err) {
        setError((err as Error).message)
        setDocs([])
      }
    })()
  }, [])

  React.useEffect(() => {
    if (!selectedId) return
    let mounted = true
    setLoading(true)
    setError(null)
    setFilter("")
    ;(async () => {
      try {
        const res = await fetch(`/api/documents/${selectedId}/chunks?level=${level}`)
        const body = (await res.json()) as {
          title?: string
          chunks?: Chunk[]
          maxLevel?: number
          auto?: boolean
          error?: string
        }
        if (!res.ok) throw new Error(body?.error ?? "Failed to chunk document")
        if (mounted) {
          setChunks(body.chunks ?? [])
          setTitle(body.title ?? "")
          setDetected({ maxLevel: body.maxLevel ?? 2, auto: body.auto ?? false })
        }
      } catch (err) {
        if (mounted) setError((err as Error).message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [selectedId, level])

  const visibleDocs = React.useMemo(() => {
    if (!docs) return []
    const q = docQuery.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((d) => d.title.toLowerCase().includes(q) || d.sourceName.toLowerCase().includes(q))
  }, [docs, docQuery])

  const jsonl = React.useMemo(() => {
    if (!chunks) return ""
    return chunks
      .map((c) => JSON.stringify({ id: `${c.index}`, title, heading: c.heading, text: c.text, tokens: c.tokens }))
      .join("\n")
  }, [chunks, title])

  const totalTokens = React.useMemo(() => (chunks ?? []).reduce((s, c) => s + c.tokens, 0), [chunks])

  const shown = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q || !chunks) return chunks ?? []
    return chunks.filter((c) => (c.heading ?? "").toLowerCase().includes(q) || c.text.toLowerCase().includes(q))
  }, [chunks, filter])

  const baseName = (title || "document").replace(/[^\w.\- ]+/g, "").trim() || "document"

  const download = () => {
    const blob = new Blob([jsonl], { type: "application/jsonl" })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = `${baseName}.jsonl`
    a.click()
    URL.revokeObjectURL(href)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(jsonl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (docs === null) return <Skeleton className="min-h-0 w-full flex-1" />

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium text-sm">No documents to export</p>
          <p className="text-muted-foreground text-sm">
            Convert a file or URL on{" "}
            <Link className="text-primary underline" href="/dashboard/convert">
              Convert
            </Link>{" "}
            first, then export it here for your RAG pipeline.
          </p>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 rounded-lg border">
      {/* Document explorer */}
      <ResizablePanel defaultSize={26} minSize={18} maxSize={42}>
        <div className="flex h-full flex-col border-r">
          <div className="flex flex-col gap-2 border-b p-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <span className="font-medium text-sm">Documents</span>
              <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                {visibleDocs.length}/{docs.length}
              </span>
            </div>
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
              <Input
                value={docQuery}
                onChange={(e) => setDocQuery(e.target.value)}
                placeholder="Search documents…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-0.5 p-2">
              {visibleDocs.length === 0 ? (
                <p className="px-2 py-6 text-center text-muted-foreground text-sm">No documents match.</p>
              ) : (
                visibleDocs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      selectedId === d.id ? "bg-muted" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    title={d.title}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{d.title}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Chunk viewer */}
      <ResizablePanel defaultSize={74} minSize={40}>
        <div className="flex h-full flex-col">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm" title={title}>
              {title || "Select a document"}
            </span>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger size="sm" className="h-8 w-[10.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void copy()} disabled={!jsonl}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy JSONL"}
            </Button>
            <Button size="sm" onClick={download} disabled={!jsonl}>
              <Download className="size-4" /> Download
            </Button>
          </div>

          {/* Summary + chunk filter */}
          {chunks && !loading && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{chunks.length.toLocaleString()}</span> chunks ·{" "}
                <span className="font-medium text-foreground">{totalTokens.toLocaleString()}</span> tokens
                {detected?.auto && <> · auto: {LEVEL_LABEL[detected.maxLevel] ?? `H1–H${detected.maxLevel}`}</>}
                {filter.trim() && <> · {shown.length.toLocaleString()} match</>}
              </p>
              {chunks.length > 8 && (
                <div className="relative">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter chunks…"
                    className="h-8 w-[15rem] max-w-full pl-8"
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="px-3 py-2 text-destructive text-sm">{error}</p>}

          {/* Chunks */}
          <ScrollArea className="min-h-0 flex-1">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : shown.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                {chunks && chunks.length > 0 ? "No chunks match your filter." : "No chunks."}
              </div>
            ) : (
              <ul className="divide-y">
                {shown.map((c) => (
                  <ChunkRow key={c.index} chunk={c} />
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function ChunkRow({ chunk }: { chunk: Chunk }) {
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(chunk.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={open ? "Collapse" : "Expand"}
        >
          <span className="truncate font-medium text-sm">
            <span className="text-muted-foreground">#{chunk.index + 1}</span> {chunk.heading ?? "(no heading)"}
          </span>
        </button>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
          {chunk.tokens.toLocaleString()} tokens
        </span>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" title="Copy this chunk" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-left">
        <p className={cn("whitespace-pre-wrap text-muted-foreground text-xs", !open && "line-clamp-2")}>{chunk.text}</p>
      </button>
    </li>
  )
}
