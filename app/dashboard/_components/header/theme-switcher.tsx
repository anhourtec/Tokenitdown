"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

const order = ["light", "dark", "system"] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current = (theme ?? "system") as (typeof order)[number]

  function cycle() {
    const next = order[(order.indexOf(current) + 1) % order.length] ?? "system"
    setTheme(next)
  }

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const Icon = !mounted ? Sun : current === "dark" ? Moon : current === "system" ? Monitor : Sun

  return (
    <Button size="icon" onClick={cycle} aria-label={`Theme: ${current}. Click to change.`}>
      <Icon />
    </Button>
  )
}
