import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Outbound links, overridable per environment (see next.config.mjs). */
export const links = {
  app: process.env.NEXT_PUBLIC_APP_URL || "https://app.tokenitdown.com",
  docs: process.env.NEXT_PUBLIC_DOCS_URL || "https://tokenitdown.com/docs",
  github: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/anhourtec/tokenitdown",
}

/** Resolve a content href: a known outbound key (app/docs/github) or a literal. */
export function resolveHref(href: string): string {
  return href in links ? links[href as keyof typeof links] : href
}
