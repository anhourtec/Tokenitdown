import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * The TokenItDown logo mark (public/token-it-down.svg). Size it with
 * Tailwind on `className` — e.g. `size-10` for a square slot (letterboxed via
 * object-contain) or `h-12 w-auto` to scale by the logo's aspect ratio.
 */
export function BrandMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/token-it-down.svg"
      alt="TokenItDown"
      width={240}
      height={228}
      // Vector source — skip the optimizer so it stays crisp at any display size.
      unoptimized
      priority={priority}
      className={cn("object-contain", className)}
    />
  )
}
