"use client"

import { Download, FileText, Loader2, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CleanInsightsButton } from "@/components/ui/clean-insights"
import ComponentFileViewer, { type ApiComponent } from "@/components/ui/file-viewer"
import { Input } from "@/components/ui/input"
import { ExplorerSkeleton } from "@/components/ui/page-skeletons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { CleanStats } from "@/lib/markdown/clean"

interface DocSummary {
  id: string
  title: string
  sourceType: "file" | "url"
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  createdAt: string
}

interface DocDetail {
  markdown?: string
  rawTokens?: number
  cleanTokens?: number
  cleanTier?: string
  cleanStats?: CleanStats | null
}

interface LoadedDoc extends DocSummary {
  path: string
  markdown: string
  rawTokens?: number
  cleanTokens?: number
  cleanTier?: string
  cleanStats?: CleanStats | null
}

type SourceFilter = "all" | "file" | "url"

function uniquePath(title: string, id: string, used: Set<string>): string {
  const base = (title || "document").replace(/[^\w.\- ]+/g, "").trim() || "document"
  let path = base.toLowerCase().endsWith(".md") ? base : `${base}.md`
  if (used.has(path)) path = `${base} (${id.slice(0, 4)}).md`
  used.add(path)
  return path
}

export function LibraryClient() {
  const docParam = useSearchParams().get("doc")
  const [docs, setDocs] = React.useState<LoadedDoc[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [activePath, setActivePath] = React.useState<string | undefined>(undefined)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [source, setSource] = React.useState<SourceFilter>("all")

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/documents")
      const body = (await res.json()) as { documents?: DocSummary[]; error?: string }
      if (!res.ok) throw new Error(body?.error ?? "Failed to load documents")
      const summaries = body.documents ?? []
      const used = new Set<string>()
      const loaded = await Promise.all(
        summaries.map(async (d) => {
          const r = await fetch(`/api/documents/${d.id}`)
          const full = (await r.json()) as DocDetail
          return {
            ...d,
            path: uniquePath(d.title, d.id, used),
            markdown: full.markdown ?? "",
            rawTokens: full.rawTokens,
            cleanTokens: full.cleanTokens,
            cleanTier: full.cleanTier,
            cleanStats: full.cleanStats ?? null,
          }
        })
      )
      setDocs(loaded)
    } catch (err) {
      setError((err as Error).message)
      setDocs([])
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  // Filtered + ordered docs feeding the viewer. A `?doc=<id>` deep-link is moved
  // to the front so the viewer auto-selects it.
  const visible = React.useMemo(() => {
    if (!docs) return []
    const q = query.trim().toLowerCase()
    let list = docs.filter((d) => source === "all" || d.sourceType === source)
    if (q) list = list.filter((d) => d.title.toLowerCase().includes(q) || d.sourceName.toLowerCase().includes(q))
    if (docParam) {
      const idx = list.findIndex((d) => d.id === docParam)
      if (idx > 0) list = [list[idx]!, ...list.slice(0, idx), ...list.slice(idx + 1)]
    }
    return list
  }, [docs, query, source, docParam])

  const activeDoc = React.useMemo(() => visible.find((d) => d.path === activePath) ?? visible[0], [visible, activePath])

  React.useEffect(() => {
    setConfirmDelete(false)
  }, [activeDoc?.id])

  const component: ApiComponent | null = React.useMemo(() => {
    if (!docs) return null
    return { name: "Your library", files: visible.map((d) => ({ path: d.path, content: d.markdown })) }
  }, [docs, visible])

  const downloadActive = () => {
    if (!activeDoc) return
    const blob = new Blob([activeDoc.markdown], { type: "text/markdown" })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = activeDoc.path
    a.click()
    URL.revokeObjectURL(href)
  }

  const removeActive = async () => {
    if (!activeDoc) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDocs((prev) => prev?.filter((d) => d.id !== activeDoc.id) ?? null)
      setActivePath(undefined)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (docs === null) {
    return <ExplorerSkeleton topbar />
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
            Head to{" "}
            <Link className="text-primary underline" href="/dashboard/convert">
              Convert
            </Link>{" "}
            to turn a file or URL into Markdown.
          </p>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
          <SelectTrigger size="sm" className="h-9 w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="file">Files</SelectItem>
            <SelectItem value="url">Web &amp; YouTube</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-muted-foreground text-sm tabular-nums">
          {visible.length} of {docs.length}
        </span>
      </div>

      {component && visible.length > 0 ? (
        <ComponentFileViewer
          key={`${docParam ?? ""}|${visible.map((d) => d.id).join(",")}`}
          component={component}
          className="min-h-0 flex-1"
          onActiveFileChange={setActivePath}
          headerActions={
            <>
              {activeDoc && (
                <CleanInsightsButton
                  rawTokens={activeDoc.rawTokens}
                  cleanTokens={activeDoc.cleanTokens}
                  cleanTier={activeDoc.cleanTier}
                  stats={activeDoc.cleanStats}
                />
              )}
              <Button variant="ghost" size="icon" className="size-8" title="Download .md" onClick={downloadActive}>
                <Download className="size-3.5" />
              </Button>
              {confirmDelete ? (
                <Button variant="destructive" size="sm" disabled={deleting} onClick={() => void removeActive()}>
                  {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Confirm
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive"
                  title="Delete"
                  onClick={() => setConfirmDelete(true)}
                  onBlur={() => setConfirmDelete(false)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </>
          }
        />
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center rounded-lg border text-muted-foreground text-sm">
          No documents match your search.
        </div>
      )}
    </div>
  )
}
