import { cn } from "@/lib/utils"

/** A small pill label with a live ping dot, sat above section headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur",
        className
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
      </span>
      {children}
    </span>
  )
}
