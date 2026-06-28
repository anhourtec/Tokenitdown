"use client"

import { Gauge } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { CleanStats } from "@/lib/markdown/clean"

/** Human labels for each cleaning transform, in display order. */
const STAT_LABELS: { key: keyof CleanStats; label: string }[] = [
  { key: "boilerplateLinesRemoved", label: "Repeated headers & page numbers" },
  { key: "webChromeRemoved", label: "Navigation & footer chrome" },
  { key: "imagesExtracted", label: "Embedded images stripped" },
  { key: "tablesNormalized", label: "Tables tidied" },
  { key: "hyphenationsJoined", label: "Hyphenated words rejoined" },
  { key: "headingsPromoted", label: "Headings recovered" },
  { key: "linksStripped", label: "Link URLs removed" },
]

export interface CleanInsightsProps {
  rawTokens?: number | null
  cleanTokens?: number | null
  cleanTier?: string | null
  stats?: Partial<CleanStats> | null
  className?: string
}

function pctSaved(raw: number, clean: number): number {
  if (raw <= 0) return 0
  return Math.max(0, Math.round(((raw - clean) / raw) * 1000) / 10)
}

/**
 * Transparent view of what the cleaning pass did to a document: the token
 * savings (with a progress bar) and a per-transform breakdown of exactly what
 * was eliminated.
 */
export function CleanInsights({ rawTokens, cleanTokens, cleanTier, stats, className }: CleanInsightsProps) {
  const raw = rawTokens ?? 0
  const clean = cleanTokens ?? raw
  const hasTokens = raw > 0
  const pct = pctSaved(raw, clean)
  const saved = Math.max(0, raw - clean)

  const removed = STAT_LABELS.map(({ key, label }) => ({ label, count: stats?.[key] ?? 0 })).filter((r) => r.count > 0)

  const tierLabel = cleanTier === "compact" ? "Compact" : cleanTier === "raw" ? "Raw" : "Clean"

  return (
    <section className={cn("rounded-lg border bg-card text-card-foreground", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="font-semibold text-sm">Cleaning insights</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">{tierLabel} tier</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-3">
        {hasTokens ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm">Token savings</span>
              <span className={cn("font-semibold text-sm tabular-nums", pct > 0 ? "text-primary" : "text-muted-foreground")}>
                {pct > 0 ? `−${pct}%` : "0%"}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Token savings"
              className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {raw.toLocaleString()} → {clean.toLocaleString()} tokens
              {saved > 0 && <> · {saved.toLocaleString()} saved</>}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Token count unavailable for this document.</p>
        )}

        {removed.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-muted-foreground text-xs">What we eliminated</p>
            <ul className="divide-y divide-border rounded-md border">
              {removed.map((r) => (
                <li key={r.label} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium tabular-nums">{r.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          stats != null && (
            <p className="text-muted-foreground text-sm">
              Whitespace and formatting normalized — no removable boilerplate found.
            </p>
          )
        )}

        <p className="text-muted-foreground text-xs leading-relaxed">
          Original engine output is kept and re-processable. Token counts reflect what an LLM actually sees.
        </p>
      </div>
    </section>
  )
}

/**
 * Compact toolbar control: a small button showing the token savings; opens the
 * full CleanInsights breakdown in a popover. Used in the Library/Documents
 * viewer headers so the panel doesn't take permanent vertical space.
 */
export function CleanInsightsButton(props: CleanInsightsProps) {
  const raw = props.rawTokens ?? 0
  const clean = props.cleanTokens ?? raw
  const pct = pctSaved(raw, clean)
  const label = raw > 0 && pct > 0 ? `−${pct}%` : "Insights"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          title="Cleaning insights & token savings"
        >
          <Gauge className="size-3.5" />
          <span className="tabular-nums">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <CleanInsights {...props} className="border-0 bg-transparent" />
      </PopoverContent>
    </Popover>
  )
}
