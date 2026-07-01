import { cn } from "@/lib/utils"

/**
 * A seamless horizontal marquee. Renders the children twice so the -50% keyframe
 * loops without a jump. Pauses on hover; honors reduced-motion via globals.css.
 */
export function Marquee({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("marquee-mask group relative w-full overflow-hidden", className)}>
      <div className="animate-marquee flex w-max items-center gap-12 group-hover:[animation-play-state:paused]">
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div className="flex shrink-0 items-center gap-12" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
