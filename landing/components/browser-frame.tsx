import Image from "next/image"

import { Bezel } from "@/components/soft-card"
import { cn } from "@/lib/utils"

/** A screenshot seated in the soft bezel with minimal browser chrome. */
export function BrowserFrame({
  src,
  alt,
  priority,
  className,
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
}) {
  return (
    <Bezel className={className}>
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
      </div>
      <Image src={src} alt={alt} width={1600} height={1000} priority={priority} className={cn("h-auto w-full")} />
    </Bezel>
  )
}
