"use client"

import * as React from "react"

import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

export interface CodeTab {
  name: string
  cmd: string
}

/** Tabbed command block (e.g. npm / pnpm / yarn / bun). */
export function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = React.useState(0)
  const tab = tabs[active] ?? tabs[0]
  if (!tab) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 pr-2">
        <div className="flex" role="tablist" aria-label="Package manager">
          {tabs.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "border-b-2 px-3.5 py-2 font-mono text-xs transition-colors",
                i === active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
        <CopyButton value={tab.cmd} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-foreground">
        <code>{tab.cmd}</code>
      </pre>
    </div>
  )
}
