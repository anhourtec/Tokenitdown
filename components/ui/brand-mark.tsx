import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * The TokenItDown logo mark (public/token_it_down_logo.png). Size it with
 * Tailwind on `className` — e.g. `size-10` for a square slot (letterboxed via
 * object-contain) or `h-12 w-auto` to scale by the logo's aspect ratio.
 */
export function BrandMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/token_it_down_logo.png"
      alt="TokenItDown"
      width={2754}
      height={1536}
      // Serve the original and let the browser downscale — the optimizer's
      // re-encode softened this detailed illustration. Crisp at any display size.
      unoptimized
      priority={priority}
      className={cn("object-contain", className)}
    />
  )
}
