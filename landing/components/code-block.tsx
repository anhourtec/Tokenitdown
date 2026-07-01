import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

/** A monospace command block with an optional label strip and copy button. */
export function CodeBlock({
  code,
  label,
  className,
  copy = true,
}: {
  code: string
  label?: string
  className?: string
  copy?: boolean
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      {(label || copy) && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">{label}</span>
          {copy && <CopyButton value={code} />}
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}
