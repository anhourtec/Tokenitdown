import * as React from "react"

/** Renders a title string where **wrapped** spans are painted in the brand color. */
export function EmphasisHeading({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} className="text-primary">
            {part.slice(2, -2)}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  )
}
