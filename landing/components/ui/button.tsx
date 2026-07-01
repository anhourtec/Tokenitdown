import * as React from "react"

import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost"
type Size = "sm" | "md" | "lg"

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-[0.95rem] gap-2",
}

const base =
  "inline-flex items-center justify-center rounded-[14px] font-medium whitespace-nowrap transition-[transform,box-shadow,background-color,border-color] duration-200 will-change-transform hover:scale-[1.03] active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const VARIANTS: Record<Variant, string> = {
  // glossy brand gradient: lightened top, inset sheen ring, soft blue glow
  primary:
    "text-primary-foreground ring-1 ring-inset ring-white/20 shadow-[0_2px_12px_-1px_color-mix(in_oklch,var(--primary)_45%,transparent)] hover:shadow-[0_5px_18px_-1px_color-mix(in_oklch,var(--primary)_55%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_84%,white),var(--primary))]",
  secondary: "border border-border bg-background text-foreground shadow-sm hover:bg-muted hover:border-border",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
}

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
}

/** Link styled as a button (the landing page is all outbound links). */
export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <a className={cn(base, SIZES[size], VARIANTS[variant], className)} {...props} />
}
