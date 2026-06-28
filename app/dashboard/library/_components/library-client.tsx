"use client"

import { Download, FileText, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import ComponentFileViewer, { type ApiComponent } from "@/components/ui/file-viewer"
import { Skeleton } from "@/components/ui/skeleton"

interface DocSummary {
  id: string
  title: string
  sourceType: "file" | "url"
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  createdAt: string
}

interface LoadedDoc extends DocSummary {
  path: string
  markdown: string
}

function uniquePath(title: string, id: string, used: Set<string>): string {
  const base = (title || "document").replace(/[^\w.\- ]+/g, "").trim() || "document"
  let path = base.toLowerCase().endsWith(".md") ? base : `${base}.md`
  if (used.has(path)) path = `${base} (${id.slice(0, 4)}).md`
  used.add(path)
  return path
}

export function LibraryClient() {
  const [docs, setDocs] = React.useState<LoadedDoc[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [activePath, setActivePath] = React.useState<string | undefined>(undefined)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

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
          const full = (await r.json()) as { markdown?: string }
          return { ...d, path: uniquePath(d.title, d.id, used), markdown: full.markdown ?? "" }
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

  const activeDoc = React.useMemo(() => docs?.find((d) => d.path === activePath) ?? docs?.[0], [docs, activePath])

  React.useEffect(() => {
    setConfirmDelete(false)
  }, [activeDoc?.id])

  const component: ApiComponent | null = React.useMemo(() => {
    if (!docs) return null
    return { name: "Your library", files: docs.map((d) => ({ path: d.path, content: d.markdown })) }
  }, [docs])

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
    return <Skeleton className="min-h-0 w-full flex-1" />
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
    <>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {component && (
        <ComponentFileViewer
          key={docs.map((d) => d.id).join(",")}
          component={component}
          className="min-h-0 flex-1"
          onActiveFileChange={setActivePath}
          headerActions={
            <>
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
      )}
    </>
  )
}
