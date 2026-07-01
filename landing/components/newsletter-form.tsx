"use client"

import * as React from "react"

/**
 * Newsletter capture. No backend is wired yet, so it acknowledges locally; swap
 * the handler for a real endpoint (e.g. /api/subscribe) when one exists.
 */
export function NewsletterForm({
  title,
  body,
  placeholder,
  cta,
}: {
  title: string
  body: string
  placeholder: string
  cta: string
}) {
  const [done, setDone] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
      {done ? (
        <p className="text-sm text-primary">Thanks, you are on the list.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setDone(true)
          }}
          className="mt-1 flex gap-2"
        >
          <input
            type="email"
            required
            placeholder={placeholder}
            aria-label="Email address"
            className="h-9 w-full min-w-0 rounded-full border border-input bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {cta}
          </button>
        </form>
      )}
    </div>
  )
}
