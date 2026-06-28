"use client"

import { Check, Copy, Download, FileText, Link2, Loader2, Trash2 } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DocSummary {
  id: string
  title: string
  sourceType: "file" | "url"
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  createdAt: string
}

interface DocDetail extends DocSummary {
  markdown: string
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function downloadMarkdown(name: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" })
  const href = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const base = name.replace(/[^\w.-]+/g, "-").replace(/\.[^.]+$/, "") || "document"
  a.href = href
  a.download = `${base}.md`
  a.click()
  URL.revokeObjectURL(href)
}

export function LibraryClient() {
  const [docs, setDocs] = React.useState<DocSummary[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState<DocDetail | null>(null)
  const [loadingDoc, setLoadingDoc] = React.useState(false)
  const [confirmId, setConfirmId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/documents")
      const body = (await res.json()) as { documents?: DocSummary[]; error?: string }
      if (!res.ok) throw new Error(body?.error ?? "Failed to load documents")
      setDocs(body.documents ?? [])
    } catch (err) {
      setError((err as Error).message)
      setDocs([])
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const view = async (id: string) => {
    setOpen(true)
    setActive(null)
    setLoadingDoc(true)
    try {
      const res = await fetch(`/api/documents/${id}`)
      const body = (await res.json()) as DocDetail & { error?: string }
      if (!res.ok) throw new Error(body?.error ?? "Failed to load document")
      setActive(body)
    } catch (err) {
      setError((err as Error).message)
      setOpen(false)
    } finally {
      setLoadingDoc(false)
    }
  }

  const downloadById = async (doc: DocSummary) => {
    const res = await fetch(`/api/documents/${doc.id}`)
    const body = (await res.json()) as { markdown?: string }
    if (res.ok) downloadMarkdown(doc.title, body.markdown ?? "")
  }

  const remove = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDocs((prev) => prev?.filter((d) => d.id !== id) ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const copyActive = async () => {
    if (!active) return
    await navigator.clipboard.writeText(active.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (docs === null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <p className="font-medium text-sm">No documents yet</p>
          <p className="text-muted-foreground text-sm">
            Head to <a className="text-primary underline" href="/dashboard/convert">Convert</a> to turn a file or URL into Markdown.
          </p>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-44">Created</TableHead>
                <TableHead className="w-px text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-0">
                    <button
                      className="flex w-full items-center gap-2 truncate text-left hover:underline"
                      onClick={() => void view(doc.id)}
                      title={doc.sourceName}
                    >
                      {doc.sourceType === "url" ? (
                        <Link2 className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate font-medium">{doc.title}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.sourceType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatBytes(doc.sizeBytes)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(doc.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => void downloadById(doc)}>
                        <Download className="size-4" /> .md
                      </Button>
                      {confirmId === doc.id ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === doc.id}
                          onClick={() => void remove(doc.id)}
                        >
                          {deletingId === doc.id ? <Loader2 className="size-4 animate-spin" /> : null}
                          Confirm
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => setConfirmId(doc.id)}
                          onBlur={() => setConfirmId((c) => (c === doc.id ? null : c))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="truncate">{active?.title ?? "Loading…"}</SheetTitle>
            <SheetDescription className="truncate">{active?.sourceName}</SheetDescription>
          </SheetHeader>
          <div className="flex items-center gap-2 px-4 pb-2">
            <Button variant="outline" size="sm" disabled={!active} onClick={() => void copyActive()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!active}
              onClick={() => active && downloadMarkdown(active.title, active.markdown)}
            >
              <Download className="size-4" /> .md
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            {loadingDoc || !active ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : (
              <pre className="rounded-md border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-words">
                {active.markdown}
              </pre>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
