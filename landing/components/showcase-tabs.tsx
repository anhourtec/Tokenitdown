"use client"

import * as React from "react"

import { Markdown } from "@/components/markdown"
import { cn } from "@/lib/utils"

export interface Sample {
  name: string
  note: string
  markdown: string
}

type View = "preview" | "raw"

/** Pick a document type, then flip between the rendered Markdown and its raw source. */
export function ShowcaseTabs({ samples }: { samples: Sample[] }) {
  const [active, setActive] = React.useState(0)
  const [view, setView] = React.useState<View>("preview")
  const sample = samples[active] ?? samples[0]
  if (!sample) return null

  return (
    <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" role="tablist" aria-label="Document types">
        {samples.map((s, i) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "flex shrink-0 flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-colors lg:shrink",
              i === active ? "bg-primary/[0.06] text-foreground ring-1 ring-primary/25" : "hover:bg-muted"
            )}
          >
            <span className="text-sm font-medium">{s.name}</span>
            <span className="hidden text-xs text-muted-foreground lg:block">{s.note}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_16px_-8px_rgba(20,20,40,0.18)]">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{sample.name}</span>
          <div className="flex rounded-lg bg-muted p-0.5 font-mono text-xs" role="tablist" aria-label="Output view">
            {(["preview", "raw"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-2.5 py-1 capitalize transition-colors",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[26rem] overflow-y-auto text-left">
          {view === "preview" ? (
            <Markdown className="prose-sm p-6">{sample.markdown}</Markdown>
          ) : (
            <pre className="whitespace-pre-wrap break-words p-6 font-mono text-xs leading-relaxed text-foreground/90">
              {sample.markdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
