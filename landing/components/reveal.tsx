"use client"

import { gsap } from "gsap"
import * as React from "react"

const useIso = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stagger index or explicit delay (seconds). */
  delay?: number
  /** Translate distance in px (default 12). */
  y?: number
  as?: React.ElementType
}

/**
 * Blur-fade-up entrance as the element scrolls into view (GSAP tween driven by an
 * IntersectionObserver). Content renders VISIBLE on the server, so SSR, no-JS, and
 * SEO all see it; only the client, with motion allowed, hides it before paint and
 * reveals it on intersection. Using IntersectionObserver (not cached scroll
 * positions) keeps it correct even when tall screenshots load in late.
 */
export function Reveal({ delay = 0, y = 12, as: Tag = "div", className, children, ...rest }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  useIso(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.set(el, { opacity: 0, y, filter: "blur(6px)" })

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          gsap.to(el, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
            delay,
            ease: "power3.out",
          })
          obs.unobserve(el)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    )
    io.observe(el)

    return () => {
      io.disconnect()
      gsap.killTweensOf(el)
    }
  }, [delay, y])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}
