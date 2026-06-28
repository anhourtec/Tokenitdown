"use client"

import { cn } from "@/lib/utils"

/**
 * Document-scanning animation shown while a conversion is in flight. A stylized
 * page with shimmering "text" lines and a primary-colored scan beam sweeping
 * top-to-bottom — evokes OCR/parsing. Pure CSS/SVG, brand-colored via the
 * `--primary` token so it always matches the active theme.
 */
export function ScanAnimation({ className, label = "Scanning document…" }: { className?: string; label?: string }) {
  const lines = [92, 78, 85, 64, 88, 72, 90, 58, 80, 68]

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-8", className)}>
      <div className="relative h-44 w-32 overflow-hidden rounded-md border bg-card shadow-sm">
        {/* page content (shimmering lines) */}
        <div className="flex h-full flex-col gap-2 p-3">
          <div className="mb-1 h-3 w-2/3 rounded-sm bg-primary/30" />
          {lines.map((w, i) => (
            <div
              key={i}
              className="scan-line-bar h-1.5 rounded-sm bg-muted-foreground/20"
              style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>

        {/* sweeping scan beam */}
        <div className="scan-beam pointer-events-none absolute inset-x-0 top-0 h-10">
          <div className="h-px w-full bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
          <div className="h-10 w-full bg-gradient-to-b from-primary/25 to-transparent" />
        </div>

        {/* corner brackets */}
        <span className="absolute left-1 top-1 size-3 border-l-2 border-t-2 border-primary/70" />
        <span className="absolute right-1 top-1 size-3 border-r-2 border-t-2 border-primary/70" />
        <span className="absolute bottom-1 left-1 size-3 border-b-2 border-l-2 border-primary/70" />
        <span className="absolute bottom-1 right-1 size-3 border-b-2 border-r-2 border-primary/70" />
      </div>

      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <style jsx>{`
        .scan-beam {
          animation: scan-sweep 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        @keyframes scan-sweep {
          0% {
            transform: translateY(-2.5rem);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          88% {
            opacity: 1;
          }
          100% {
            transform: translateY(11rem);
            opacity: 0;
          }
        }
        .scan-line-bar {
          animation: scan-pulse 1.8s ease-in-out infinite;
        }
        @keyframes scan-pulse {
          0%,
          100% {
            background-color: color-mix(in oklch, var(--muted-foreground) 18%, transparent);
          }
          50% {
            background-color: color-mix(in oklch, var(--primary) 45%, transparent);
          }
        }
      `}</style>
    </div>
  )
}
