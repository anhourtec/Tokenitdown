"use client"

import { Github, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { ButtonLink } from "@/components/ui/button"
import { cn, resolveHref } from "@/lib/utils"

export interface NavItem {
  label: string
  scroll?: string
  href?: string
}
export interface NavData {
  name: string
  nav: NavItem[]
  ctaPrimary: { label: string; href: string }
  ctaSecondary: { label: string; href: string }
}

export function NavBar({ data }: { data: NavData }) {
  const [open, setOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)

  // Lock scroll while the mobile sheet is open.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // Show the header only near the top of the page; hide it once scrolled away
  // (in either direction), so swiping back up doesn't pop it in.
  React.useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setHidden(window.scrollY > 96)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const go = React.useCallback((item: NavItem) => {
    setOpen(false)
    if (item.scroll) {
      requestAnimationFrame(() =>
        document.getElementById(item.scroll as string)?.scrollIntoView({ behavior: "smooth", block: "start" })
      )
    }
  }, [])

  const itemHref = (item: NavItem) => (item.scroll ? `#${item.scroll}` : resolveHref(item.href ?? "#"))

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-transparent transition-transform duration-300 ease-out will-change-transform",
        hidden && !open ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <Image src="/token-it-down.svg" alt="" width={32} height={32} className="size-8" />
          {data.name}
        </Link>

        {/* desktop nav */}
        <ul className="hidden items-center gap-8 text-sm font-semibold text-foreground md:flex">
          {data.nav.map((item) => (
            <li key={item.label}>
              <a
                href={itemHref(item)}
                onClick={(e) => {
                  if (item.scroll) {
                    e.preventDefault()
                    go(item)
                  }
                }}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink
            href={resolveHref(data.ctaSecondary.href)}
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Github className="size-4" />
            {data.ctaSecondary.label}
          </ButtonLink>

          {/* hamburger */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* mobile sheet */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl md:hidden",
          "transition-[max-height,opacity] duration-300 ease-out",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {data.nav.map((item) => (
            <a
              key={item.label}
              href={itemHref(item)}
              onClick={(e) => {
                if (item.scroll) {
                  e.preventDefault()
                }
                go(item)
              }}
              className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <ButtonLink href={resolveHref(data.ctaSecondary.href)} variant="secondary" size="lg" className="w-full">
              <Github className="size-4" />
              {data.ctaSecondary.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  )
}
