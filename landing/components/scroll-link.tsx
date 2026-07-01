"use client"

import * as React from "react"

/**
 * In-page navigation that scrolls to a section WITHOUT writing a #hash to the URL
 * (product requirement). Falls back to a plain scroll if the target is missing.
 */
export function ScrollLink({
  targetId,
  className,
  children,
}: {
  targetId: string
  className?: string
  children: React.ReactNode
}) {
  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [targetId]
  )
  return (
    <a href={`#${targetId}`} onClick={onClick} className={className}>
      {children}
    </a>
  )
}
