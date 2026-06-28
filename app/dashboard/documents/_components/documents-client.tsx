"use client"

import { Check, Code2, Copy, Download, Eye, FileText, FolderOpen, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileCard, type FormatFileProps } from "@/components/ui/file-card"
import { ShikiViewer } from "@/components/ui/file-viewer"
import { Markdown } from "@/components/ui/markdown"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DocSummary {
  id: string
  title: string
  sourceType: "file" | "url"
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  createdAt: string
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EXT_CARD: Record<string, FormatFileProps> = {
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  ppt: "pptx",
  pptx: "pptx",
  xls: "xlsx",
  xlsx: "xlsx",
  csv: "csv",
  tsv: "csv",
  json: "json",
  xml: "code",
  html: "html",
  htm: "html",
  zip: "zip",
  epub: "epub",
  png: "png",
  jpg: "jpg",
  jpeg: "jpeg",
  gif: "img",
  webp: "img",
  bmp: "img",
  tiff: "img",
  mp3: "mp3",
  wav: "mp3",
  m4a: "mp3",
  txt: "txt",
}

function cardFor(doc: DocSummary): FormatFileProps {
  return EXT_CARD[extOf(doc.sourceName)] ?? "txt"
}

function previewKind(doc: DocSummary): "pdf" | "image" | "other" {
  const mime = (doc.mimetype ?? "").toLowerCase()
  const ext = extOf(doc.sourceName)
  if (mime === "application/pdf" || ext === "pdf") return "pdf"
  const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"]
  if ((mime.startsWith("image/") && mime !== "image/svg+xml") || imageExts.includes(ext)) return "image"
  return "other"
}

export function DocumentsClient() {
  const [docs, setDocs] = React.useState<DocSummary[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [activeId, setActiveId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/documents")
        const body = (await res.json()) as { documents?: DocSummary[]; error?: string }
        if (!res.ok) throw new Error(body?.error ?? "Failed to load documents")
        if (mounted) setDocs((body.documents ?? []).filter((d) => d.sourceType === "file"))
      } catch (err) {
        if (mounted) {
          setError((err as Error).message)
          setDocs([])
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const active = React.useMemo(() => docs?.find((d) => d.id === activeId) ?? docs?.[0], [docs, activeId])

  const removeDoc = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed to delete")
    setDocs((prev) => prev?.filter((d) => d.id !== id) ?? null)
    setActiveId(undefined)
  }, [])

  if (docs === null) return <Skeleton className="min-h-0 w-full flex-1" />

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <p className="font-medium text-sm">No uploaded documents yet</p>
          <p className="text-muted-foreground text-sm">
            Upload a file on{" "}
            <Link className="text-primary underline" href="/dashboard/convert">
              Convert
            </Link>{" "}
            — the original is stored here.
          </p>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 rounded-lg border">
      <ResizablePanel defaultSize={26} minSize={18} maxSize={42}>
        <div className="flex h-full flex-col border-r">
          <div className="flex items-center gap-2 border-b p-3">
            <FolderOpen className="size-4" />
            <span className="text-sm font-medium">Originals ({docs.length})</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-0.5 p-2">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveId(doc.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    active?.id === doc.id ? "bg-muted" : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={doc.sourceName}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{doc.sourceName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={74} minSize={40}>
        {active ? <Preview key={active.id} doc={active} onDelete={removeDoc} /> : null}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

type Tab = "original" | "markdown"

function Preview({ doc, onDelete }: { doc: DocSummary; onDelete: (id: string) => Promise<void> }) {
  const kind = previewKind(doc)
  const fileUrl = `/api/documents/${doc.id}/file`

  const [tab, setTab] = React.useState<Tab>("original")
  const [mdView, setMdView] = React.useState<"preview" | "raw">("preview")
  const [markdown, setMarkdown] = React.useState<string | null>(null)
  const [mdError, setMdError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (tab !== "markdown" || markdown !== null) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}`)
        const body = (await res.json()) as { markdown?: string; error?: string }
        if (!res.ok) throw new Error(body?.error ?? "Failed to load markdown")
        if (mounted) setMarkdown(body.markdown ?? "")
      } catch (err) {
        if (mounted) setMdError((err as Error).message)
      }
    })()
    return () => {
      mounted = false
    }
  }, [tab, markdown, doc.id])

  const copyMd = async () => {
    if (!markdown) return
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const del = async () => {
    setDeleting(true)
    try {
      await onDelete(doc.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="truncate text-xs text-muted-foreground" title={doc.sourceName}>
          {doc.sourceName}
        </span>
        <div className="flex items-center gap-1">
          {/* Original / Markdown tabs */}
          <div className="flex items-center rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setTab("original")}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                tab === "original" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => setTab("markdown")}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                tab === "markdown" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Markdown
            </button>
          </div>

          {tab === "markdown" && (
            <>
              <div className="flex items-center rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setMdView("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
                    mdView === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="size-3" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => setMdView("raw")}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
                    mdView === "raw" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Code2 className="size-3" /> Raw
                </button>
              </div>
              <Button variant="ghost" size="icon" className="size-8" title="Copy Markdown" onClick={() => void copyMd()}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </>
          )}

          <a href={fileUrl} download={doc.sourceName}>
            <Button variant="ghost" size="icon" className="size-8" title="Download original">
              <Download className="size-3.5" />
            </Button>
          </a>

          {confirmDelete ? (
            <Button variant="destructive" size="sm" disabled={deleting} onClick={() => void del()}>
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Confirm
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive"
              title="Delete document"
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/30">
        {tab === "original" ? (
          <>
            {kind === "pdf" && <iframe src={fileUrl} title={doc.sourceName} className="h-full w-full border-0" />}
            {kind === "image" && (
              <div className="flex h-full items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl} alt={doc.sourceName} className="max-h-full max-w-full rounded-md object-contain" />
              </div>
            )}
            {kind === "other" && (
              <div className="grid h-full place-items-center p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <FileCard formatFile={cardFor(doc)} />
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{doc.sourceName}</p>
                    <p className="text-muted-foreground text-sm">{formatBytes(doc.sizeBytes)}</p>
                    <p className="max-w-xs text-muted-foreground text-xs">
                      This file type can&apos;t be previewed in the browser. Switch to <strong>Markdown</strong> to read
                      the converted content, or download the original.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={fileUrl} download={doc.sourceName}>
                      <Button variant="outline" size="sm">
                        <Download className="size-3.5" /> Download
                      </Button>
                    </a>
                    <Button size="sm" onClick={() => setTab("markdown")}>
                      View Markdown
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : mdError ? (
          <p className="p-5 text-destructive text-sm">{mdError}</p>
        ) : markdown === null ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : mdView === "preview" ? (
          <div className="bg-background p-5">
            <Markdown content={markdown} />
          </div>
        ) : (
          <ShikiViewer code={markdown} lang="markdown" />
        )}
      </div>
    </div>
  )
}
