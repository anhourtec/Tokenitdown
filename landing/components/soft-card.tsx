import * as React from "react"

import { cn } from "@/lib/utils"

const SOFT_SHADOW = "shadow-[0_2px_16px_-8px_rgba(20,20,40,0.18)]"

/** The house card: soft border, low shadow, large radius, subtle top-lit surface. */
export function SoftCard({
  as: Tag = "div",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border bg-card",
        SOFT_SHADOW,
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** A padded gradient bezel that seats a screenshot or sample panel, big radius. */
export function Bezel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("surface-bezel rounded-[1.75rem] p-2 sm:p-3", SOFT_SHADOW, className)}>
      <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card">{children}</div>
    </div>
  )
}
