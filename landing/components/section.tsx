import * as React from "react"

import { Eyebrow } from "@/components/eyebrow"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"

interface SectionProps {
  id?: string
  eyebrow?: string
  title?: React.ReactNode
  lede?: string
  className?: string
  /** Draw a hairline top border to separate from the previous block. */
  bordered?: boolean
  /** Constrain + center the whole section body under the header. */
  children?: React.ReactNode
}

/**
 * Section shell: a centered eyebrow, a refined semibold title with tight
 * tracking, and a lede, revealed on scroll. The body composes below (usually one
 * product visual, matching the calm one-idea-per-scroll rhythm).
 */
export function Section({ id, eyebrow, title, lede, className, bordered, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28", bordered && "border-t border-border", className)}
    >
      {(eyebrow || title || lede) && (
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {title && (
            <h2 className="text-balance font-semibold text-[clamp(1.85rem,3.6vw,2.9rem)] leading-[1.08] tracking-[-0.03em]">
              {title}
            </h2>
          )}
          {lede && (
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{lede}</p>
          )}
        </Reveal>
      )}
      {children}
    </section>
  )
}
