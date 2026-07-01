"use client"

import * as React from "react"

import { Markdown } from "@/components/markdown"
import { cn } from "@/lib/utils"

export interface Sample {
  name: string
  note: string
  markdown: string
}

/** Pick a document type, see its converted Markdown. */
export function ShowcaseTabs({ samples }: { samples: Sample[] }) {
  const [active, setActive] = React.useState(0)
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
          <span className="font-mono text-xs text-muted-foreground">Markdown output</span>
        </div>
        <div className="max-h-[26rem] overflow-y-auto p-6 text-left">
          <Markdown className="prose-sm">{sample.markdown}</Markdown>
        </div>
      </div>
    </div>
  )
}
