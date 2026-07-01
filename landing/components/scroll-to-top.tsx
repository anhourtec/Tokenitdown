"use client"

import { ArrowUp } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Floating scroll-to-top button (bottom-right) whose ring fills with reading
 * progress. Appears once the reader is a little way down the page.
 */
export function ScrollToTop() {
  const [progress, setProgress] = React.useState(0)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        setProgress(max > 0 ? Math.min(1, y / max) : 0)
        setVisible(y > 400)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-50 grid size-12 place-items-center rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur transition-all duration-300 ease-out hover:bg-muted",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <svg className="absolute inset-0 size-12 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="2" className="stroke-[var(--border)]" />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className="stroke-[var(--primary)]"
        />
      </svg>
      <ArrowUp className="size-4" />
    </button>
  )
}
