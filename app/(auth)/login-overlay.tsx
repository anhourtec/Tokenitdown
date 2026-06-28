"use client"

import { Check } from "lucide-react"
import { useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { BrandMark } from "../../components/ui/brand-mark"
import { cn } from "../../lib/utils"

const STEPS_LOGIN = [
  "Verifying your account",
  "Loading your library",
  "Preparing the converter",
  "Personalizing your workspace",
]
const STEPS_REGISTER = [
  "Creating your account",
  "Setting up your library",
  "Preparing the converter",
  "Personalizing your workspace",
]

const DURATION_MS = 2600

function initials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0]?.replace(/[._-]+/g, " ") || ""
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length >= 2 ? `${parts[0]![0]}${parts[1]![0]}` : (parts[0]?.slice(0, 2) ?? "")
  return letters.toUpperCase() || "·"
}

/** A small dashed-rule label, e.g. ──── BY ANHOURTEC ──── */
function RuleLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground">
      <span className="h-px w-6 bg-border" />
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em]">{children}</span>
      <span className="h-px w-6 bg-border" />
    </div>
  )
}

/**
 * Full-screen branded loading sequence shown after a successful sign-in/up while
 * the dashboard is prepared. Animates a progress bar 0→100% across staged steps,
 * then calls onComplete to navigate.
 */
export function LoginOverlay({
  name,
  email,
  image,
  mode = "login",
  onComplete,
}: {
  name: string
  email: string
  image?: string | null
  mode?: "login" | "register"
  onComplete: () => void
}) {
  const steps = mode === "register" ? STEPS_REGISTER : STEPS_LOGIN
  const [pct, setPct] = useState(0)
  // Drives the bar via one CSS transition (0→100% over the full duration), so the
  // fill is smooth regardless of React's render cadence. The rAF below only feeds
  // the % readout and the step highlighting.
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setStarted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let raf = 0
    let done = false
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(100, ((now - start) / DURATION_MS) * 100)
      setPct(p)
      if (p < 100) {
        raf = requestAnimationFrame(tick)
      } else if (!done) {
        done = true
        setTimeout(onComplete, 400)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onComplete])

  const complete = pct >= 100
  const current = complete ? steps.length : Math.min(steps.length - 1, Math.floor(pct / (100 / steps.length)))
  const status = complete ? "Ready" : (steps[current] ?? "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-7 text-center">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl border bg-card shadow-sm">
            <BrandMark className="size-11" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-bold text-3xl tracking-tight">TokenItDown</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-xs uppercase tracking-[0.18em]">by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/anhourtec_logo_lightbg.svg" alt="AnHourTec" className="h-6 w-auto dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/anhourtec_logo_darkbg.svg" alt="AnHourTec" className="hidden h-6 w-auto dark:block" />
            </div>
          </div>
        </div>

        {/* User */}
        <div className="flex flex-col items-center gap-2">
          <Avatar className="size-12">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
              {initials(name, email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-lg">
              {mode === "register" ? "Welcome" : "Welcome back"}
              {name ? `, ${name.split(" ")[0]}` : ""}
            </p>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex items-baseline">
            <span className="font-bold text-5xl tabular-nums">{Math.round(pct)}</span>
            <span className="ml-0.5 text-muted-foreground text-xl">%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: started ? "100%" : "0%", transition: `width ${DURATION_MS}ms linear` }}
            />
          </div>
          <RuleLabel>{status}</RuleLabel>
        </div>

        {/* Steps */}
        <div className="relative flex w-full max-w-xs flex-col gap-3.5 pl-1 text-left">
          <span className="absolute top-3 bottom-3 left-[9px] w-px bg-border" aria-hidden />
          {steps.map((label, i) => {
            const stepDone = complete || i < current
            const active = !complete && i === current
            return (
              <div key={label} className="relative z-10 flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors",
                    stepDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary bg-background text-primary"
                        : "border-muted-foreground/30 bg-background"
                  )}
                >
                  {stepDone ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    <span className={cn("size-1.5 rounded-full", active ? "animate-pulse bg-primary" : "bg-muted-foreground/40")} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    active ? "font-medium text-foreground" : stepDone ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
