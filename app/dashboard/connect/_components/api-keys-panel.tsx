"use client"

import { ChevronDown, ExternalLink, KeyRound, Loader2, Trash2, TriangleAlert } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CleanInsightsButton } from "@/components/ui/clean-insights"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/utils"

import type { CleanStats } from "@/lib/markdown/clean"

import { CodeBlock } from "./code-block"

interface ApiKey {
  id: string
  name: string
  masked: string
  createdAt: string
  lastUsedAt: string | null
  calls: number
  tokensSaved: number
}

interface Conversion {
  id: string
  title: string
  sourceType: string
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  cleanTier: string
  cleanStats: CleanStats | null
  rawTokens: number
  cleanTokens: number
  createdAt: string
}

function fmt(n: number | undefined): string {
  return (n ?? 0).toLocaleString()
}

function date(s: string | null): string {
  return s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"
}

/** Exact timestamp for the hover title, e.g. "Jun 30, 2026, 6:52 PM". */
function dateTime(s: string): string {
  return new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function snippet(mcpUrl: string, token: string): string {
  return `claude mcp add --transport http tokenitdown ${mcpUrl} \\
  --header "Authorization: Bearer ${token}"`
}

export function ApiKeysPanel({ mcpUrl }: { mcpUrl: string }) {
  const [keys, setKeys] = React.useState<ApiKey[] | null>(null)
  const [name, setName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [created, setCreated] = React.useState<{ token: string; name: string } | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [conversions, setConversions] = React.useState<Record<string, Conversion[]>>({})

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/keys")
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { keys: ApiKey[] }
      setKeys(data.keys)
    } catch {
      setKeys([])
      toast.error("Couldn't load API keys.")
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = (await res.json()) as {
        token?: string
        key?: Omit<ApiKey, "calls" | "tokensSaved">
        error?: string
      }
      if (!res.ok || !data.token || !data.key) {
        throw new Error(data.error ?? "Failed to create key.")
      }
      setCreated({ token: data.token, name: trimmed })
      // A new key has no usage yet; seed the counters so the row renders.
      setKeys((prev) => [{ ...(data.key as Omit<ApiKey, "calls" | "tokensSaved">), calls: 0, tokensSaved: 0 }, ...(prev ?? [])])
      setName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key.")
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string, keyName: string) => {
    if (!window.confirm(`Revoke "${keyName}"? Any agent using it will stop working immediately.`)) return
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setKeys((prev) => (prev ?? []).filter((k) => k.id !== id))
      toast.success("Key revoked.")
    } catch {
      toast.error("Couldn't revoke the key.")
    }
  }

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!conversions[id]) {
      try {
        const res = await fetch(`/api/keys/${id}`)
        if (!res.ok) throw new Error()
        const data = (await res.json()) as { conversions: Conversion[] }
        setConversions((prev) => ({ ...prev, [id]: data.conversions }))
      } catch {
        toast.error("Couldn't load this key's activity.")
      }
    }
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Hosted access & API keys</CardTitle>
          <Badge variant="secondary">Team</Badge>
        </div>
        <CardDescription>
          For agents on any machine. Create a key, add it to your editor, and every conversion that
          agent makes shows up below and in your Library — fully transparent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Freshly created token — shown once */}
        {created && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              <TriangleAlert className="size-4 text-primary" />
              Copy your key now — it won&rsquo;t be shown again.
            </div>
            <CodeBlock code={snippet(mcpUrl, created.token)} label={`Add "${created.name}" to Claude Code`} />
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="self-start text-muted-foreground text-xs underline-offset-2 hover:underline"
            >
              I&rsquo;ve saved it
            </button>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={create} className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. laptop, CI)"
            maxLength={60}
            className="max-w-xs"
            aria-label="New key name"
          />
          <Button type="submit" disabled={creating || !name.trim()} size="sm">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Create key
          </Button>
        </form>

        {/* Keys list */}
        {keys === null ? (
          <p className="text-muted-foreground text-sm">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No keys yet. Create one above to connect an agent.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-col">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-sm">{k.name}</span>
                    <span className="font-mono text-muted-foreground text-xs">{k.masked}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4 text-xs">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-foreground tabular-nums">{fmt(k.calls)}</span>
                      <span className="text-muted-foreground">calls</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-foreground tabular-nums">{fmt(k.tokensSaved)}</span>
                      <span className="text-muted-foreground">tokens saved</span>
                    </div>
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="text-foreground">{date(k.lastUsedAt)}</span>
                      <span className="text-muted-foreground">last used</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggle(k.id)}
                      aria-label="Show activity"
                      aria-expanded={expanded === k.id}
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${expanded === k.id ? "rotate-180" : ""}`}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => revoke(k.id, k.name)}
                      aria-label={`Revoke ${k.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Per-key activity: what this agent converted */}
                {expanded === k.id && (
                  <div className="border-t bg-muted/20 p-3">
                    {!conversions[k.id] ? (
                      <p className="text-muted-foreground text-xs">Loading activity…</p>
                    ) : conversions[k.id]?.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Nothing converted with this key yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-border/60">
                        {conversions[k.id]?.map((c) => {
                          // The `sourceName` for a URL conversion is the URL itself.
                          // Only treat it as a clickable link when it's a real
                          // http(s) URL — never render an unvalidated href (guards
                          // against javascript:/data: values in legacy rows).
                          const isUrl = c.sourceType === "url" && /^https?:\/\//i.test(c.sourceName)
                          const meta = [
                            c.sizeBytes > 0 ? formatBytes(c.sizeBytes) : null,
                            c.mimetype,
                            date(c.createdAt),
                          ].filter(Boolean)
                          return (
                            <li key={c.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 text-xs">
                              {/* Row 1: type + title (opens the doc in the Library) + savings */}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="shrink-0 capitalize">
                                  {c.sourceType}
                                </Badge>
                                <Link
                                  href={`/dashboard/library?doc=${c.id}`}
                                  className="group/link flex min-w-0 flex-1 items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
                                  title={`Open "${c.title || c.sourceName}" in your Library`}
                                >
                                  <span className="truncate">{c.title || c.sourceName}</span>
                                  <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
                                </Link>
                                <CleanInsightsButton
                                  rawTokens={c.rawTokens}
                                  cleanTokens={c.cleanTokens}
                                  cleanTier={c.cleanTier}
                                  stats={c.cleanStats}
                                />
                              </div>
                              {/* Row 2: full source + size · type · exact time */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 text-muted-foreground">
                                {isUrl ? (
                                  <a
                                    href={c.sourceName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="max-w-full truncate font-mono hover:text-foreground hover:underline"
                                    title={c.sourceName}
                                  >
                                    {c.sourceName}
                                  </a>
                                ) : (
                                  <span className="max-w-full truncate font-mono" title={c.sourceName}>
                                    {c.sourceName}
                                  </span>
                                )}
                                {meta.length > 0 && (
                                  <span className="tabular-nums" title={dateTime(c.createdAt)}>
                                    · {meta.join(" · ")}
                                  </span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
