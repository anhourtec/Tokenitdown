"use client"

import { Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { UserPreferences } from "@/lib/preferences"

/** A labelled row: title + description on the left, control on the right. */
function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** Live before/after illustrating the selected cleaning tier. */
function CleaningExample({ tier }: { tier: UserPreferences["defaultCleanTier"] }) {
  const before = "## Pricing\n[See plans](https://acme.com/pricing)\n\nPage 3 of 10"
  const after =
    tier === "compact" ? "## Pricing\nSee plans" : "## Pricing\n[See plans](https://acme.com/pricing)"
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 font-medium text-muted-foreground text-xs">Example</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[0.7rem] text-muted-foreground uppercase tracking-wide">Before</p>
          <pre className="whitespace-pre-wrap font-mono text-foreground text-xs">{before}</pre>
        </div>
        <div>
          <p className="mb-1 text-[0.7rem] text-muted-foreground uppercase tracking-wide">After · {tier}</p>
          <pre className="whitespace-pre-wrap font-mono text-foreground text-xs">{after}</pre>
        </div>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        {tier === "compact"
          ? "Both tiers drop the repeated page number. Compact also strips link URLs — smallest token count (lossy)."
          : "Removes page numbers, repeated headers and blank-line runs. Keeps links, tables and structure (lossless)."}
      </p>
    </div>
  )
}

/** Shows how a sample document splits at the selected granularity. */
function ChunkExample({ level }: { level: UserPreferences["defaultChunkLevel"] }) {
  const headings = [
    { lvl: 1, t: "Guide" },
    { lvl: 2, t: "Setup" },
    { lvl: 3, t: "Install" },
    { lvl: 2, t: "Usage" },
  ]
  const eff = level === "1" ? 1 : level === "3" ? 3 : 2 // auto resolves to ~H1+H2 for this sample
  const chunks: string[][] = []
  for (const h of headings) {
    const label = `${"#".repeat(h.lvl)} ${h.t}`
    if (chunks.length === 0 || h.lvl <= eff) chunks.push([label])
    else chunks[chunks.length - 1]!.push(label)
  }
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 font-medium text-muted-foreground text-xs">
        Example → {chunks.length} chunk{chunks.length === 1 ? "" : "s"}
        {level === "auto" && <span className="text-muted-foreground"> (auto-detected per document; usually H1 + H2)</span>}
      </p>
      <div className="flex flex-col gap-1.5">
        {chunks.map((group, i) => (
          <div key={i} className="rounded border bg-background px-2 py-1.5">
            {group.map((line) => (
              <pre key={line} className="whitespace-pre font-mono text-foreground text-xs">
                {line}
              </pre>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsForm({ initial, name, email }: { initial: UserPreferences; name: string; email: string }) {
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = React.useState<UserPreferences>(initial)
  const [saved, setSaved] = React.useState<UserPreferences>(initial)
  const [saving, setSaving] = React.useState(false)

  const dirty =
    prefs.defaultCleanTier !== saved.defaultCleanTier ||
    prefs.defaultChunkLevel !== saved.defaultChunkLevel ||
    prefs.storeOriginals !== saved.storeOriginals

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })
      const body = (await res.json()) as UserPreferences & { error?: string }
      if (!res.ok) throw new Error(body?.error ?? "Failed to save")
      setSaved(body)
      setPrefs(body)
      toast.success("Settings saved")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {/* Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion</CardTitle>
          <CardDescription>Defaults applied every time you convert a file or URL.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="divide-y">
            <Row
              title="Default cleaning level"
              description="Clean keeps everything (lossless); Compact also strips link URLs for bigger token savings."
            >
              <Select
                value={prefs.defaultCleanTier}
                onValueChange={(v) =>
                  setPrefs((p) => ({ ...p, defaultCleanTier: v as UserPreferences["defaultCleanTier"] }))
                }
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">Clean (lossless)</SelectItem>
                  <SelectItem value="compact">Compact (lossy)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row
              title="Show original files"
              description="Show your uploaded originals on the Documents page. Originals are always kept on the server either way."
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="store-originals"
                  checked={prefs.storeOriginals}
                  onCheckedChange={(c) => setPrefs((p) => ({ ...p, storeOriginals: c === true }))}
                />
                <Label htmlFor="store-originals" className="text-muted-foreground text-sm">
                  {prefs.storeOriginals ? "Shown on dashboard" : "Hidden on dashboard"}
                </Label>
              </div>
            </Row>
          </div>
          <CleaningExample tier={prefs.defaultCleanTier} />
        </CardContent>
      </Card>

      {/* RAG export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RAG export</CardTitle>
          <CardDescription>Default chunk granularity on the RAG Export page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Row title="Default chunk granularity" description="Auto picks the best split for each document.">
            <Select
              value={prefs.defaultChunkLevel}
              onValueChange={(v) =>
                setPrefs((p) => ({ ...p, defaultChunkLevel: v as UserPreferences["defaultChunkLevel"] }))
              }
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="1">By H1 only</SelectItem>
                <SelectItem value="2">By H1 + H2</SelectItem>
                <SelectItem value="3">By H1–H3</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <ChunkExample level={prefs.defaultChunkLevel} />
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Applies instantly — no need to save.</CardDescription>
        </CardHeader>
        <CardContent className="py-0">
          <Row title="Theme" description="Light, dark, or follow your system.">
            <Select value={theme ?? "system"} onValueChange={setTheme}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="divide-y py-0">
          <Row title="Name" description="Shown on your account.">
            <span className="text-muted-foreground text-sm">{name}</span>
          </Row>
          <Row title="Email" description="Used to sign in.">
            <span className="text-muted-foreground text-sm">{email}</span>
          </Row>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-muted-foreground text-sm">Unsaved changes</span>}
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}
