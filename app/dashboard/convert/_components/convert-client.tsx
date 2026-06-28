"use client"

import { Check, Copy, Download, FileText, Link2, Loader2, Upload, X } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type JobStatus = "converting" | "done" | "error"

interface Job {
  id: string
  name: string
  kind: "file" | "url"
  status: JobStatus
  markdown?: string
  docId?: string
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

let counter = 0
function nextId(): string {
  counter += 1
  return `job-${counter}-${Date.now()}`
}

export function ConvertClient({ maxUploadBytes }: { maxUploadBytes: number }) {
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [url, setUrl] = React.useState("")
  const [urlBusy, setUrlBusy] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const update = React.useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [])

  const convertFile = React.useCallback(
    async (file: File) => {
      const id = nextId()
      if (file.size > maxUploadBytes) {
        setJobs((prev) => [
          { id, name: file.name, kind: "file", status: "error", error: `Exceeds the ${formatBytes(maxUploadBytes)} limit.` },
          ...prev,
        ])
        return
      }
      setJobs((prev) => [{ id, name: file.name, kind: "file", status: "converting" }, ...prev])
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/convert", { method: "POST", body: form })
        const body = (await res.json()) as { markdown?: string; title?: string | null; id?: string; error?: string }
        if (!res.ok) throw new Error(body?.error ?? `Conversion failed (${res.status})`)
        update(id, { status: "done", markdown: body.markdown, docId: body.id, name: body.title || file.name })
      } catch (err) {
        update(id, { status: "error", error: (err as Error).message })
      }
    },
    [maxUploadBytes, update]
  )

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach((file) => void convertFile(file))
    },
    [convertFile]
  )

  const convertUrl = React.useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed || urlBusy) return
    const id = nextId()
    setUrlBusy(true)
    setJobs((prev) => [{ id, name: trimmed, kind: "url", status: "converting" }, ...prev])
    try {
      const res = await fetch("/api/convert/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const body = (await res.json()) as { markdown?: string; title?: string | null; id?: string; error?: string }
      if (!res.ok) throw new Error(body?.error ?? `Conversion failed (${res.status})`)
      update(id, { status: "done", markdown: body.markdown, docId: body.id, name: body.title || trimmed })
      setUrl("")
    } catch (err) {
      update(id, { status: "error", error: (err as Error).message })
    } finally {
      setUrlBusy(false)
    }
  }, [url, urlBusy, update])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Drop zone */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload files to convert"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                handleFiles(e.dataTransfer.files)
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                <Upload className="size-5" />
              </div>
              <p className="font-medium text-sm">Drop files here, or click to browse</p>
              <p className="text-muted-foreground text-xs">
                PDF · DOCX · PPTX · XLSX · images · audio · HTML · CSV/JSON/XML · ZIP · EPUB · up to{" "}
                {formatBytes(maxUploadBytes)}
              </p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4" /> From a URL
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://example.com or a YouTube link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void convertUrl()
              }}
            />
            <Button onClick={() => void convertUrl()} disabled={!url.trim() || urlBusy}>
              {urlBusy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Convert URL
            </Button>
            <p className="text-muted-foreground text-xs">Web pages and YouTube videos (transcript).</p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {jobs.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-medium text-sm text-muted-foreground">Results</h3>
          {jobs.map((job) => (
            <ResultCard key={job.id} job={job} onDismiss={() => setJobs((p) => p.filter((j) => j.id !== job.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultCard({ job, onDismiss }: { job: Job; onDismiss: () => void }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    if (!job.markdown) return
    await navigator.clipboard.writeText(job.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (!job.markdown) return
    const blob = new Blob([job.markdown], { type: "text/markdown" })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const base = job.name.replace(/[^\w.-]+/g, "-").replace(/\.[^.]+$/, "") || "document"
    a.href = href
    a.download = `${base}.md`
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          {job.kind === "url" ? <Link2 className="size-4" /> : <FileText className="size-4" />}
        </div>
        <CardTitle className="min-w-0 flex-1 truncate text-base" title={job.name}>
          {job.name}
        </CardTitle>
        {job.status === "converting" && (
          <Badge variant="secondary">
            <Loader2 className="size-3 animate-spin" /> Converting
          </Badge>
        )}
        {job.status === "done" && (
          <Badge>
            <Check className="size-3" /> Done
          </Badge>
        )}
        {job.status === "error" && <Badge variant="destructive">Failed</Badge>}
        <div className="flex items-center gap-1">
          {job.status === "done" && (
            <>
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={download}>
                <Download className="size-4" /> .md
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={onDismiss}>
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      {(job.status === "done" || job.status === "error") && (
        <CardContent>
          {job.status === "error" ? (
            <p className="text-destructive text-sm">{job.error}</p>
          ) : (
            <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-words">
              {job.markdown}
            </pre>
          )}
        </CardContent>
      )}
    </Card>
  )
}
