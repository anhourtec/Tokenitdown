"use client"

import { ChevronDown, KeyRound, Loader2, Trash2, TriangleAlert } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
                      <ul className="flex flex-col gap-1.5">
                        {conversions[k.id]?.map((c) => {
                          const saved = Math.max(0, c.rawTokens - c.cleanTokens)
                          return (
                            <li key={c.id} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="shrink-0 capitalize">
                                {c.sourceType}
                              </Badge>
                              <span className="min-w-0 flex-1 truncate text-foreground" title={c.sourceName}>
                                {c.title || c.sourceName}
                              </span>
                              <span className="shrink-0 text-muted-foreground tabular-nums">
                                −{fmt(saved)} tok
                              </span>
                              <span className="hidden shrink-0 text-muted-foreground sm:inline">
                                {date(c.createdAt)}
                              </span>
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
