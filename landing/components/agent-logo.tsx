import { siClaude, siCline, siCursor, siGithubcopilot, siGooglegemini, siWindsurf } from "simple-icons"

import { cn } from "@/lib/utils"

/** Freely-licensed brand marks (simple-icons), rendered monochrome via currentColor. */
const ICONS: Record<string, { path: string; title: string }> = {
  claude: siClaude,
  cursor: siCursor,
  githubcopilot: siGithubcopilot,
  gemini: siGooglegemini,
  windsurf: siWindsurf,
  cline: siCline,
}

export function AgentLogo({ slug, className }: { slug?: string; className?: string }) {
  const icon = slug ? ICONS[slug] : undefined
  if (!icon) return null
  return (
    <svg role="img" aria-hidden viewBox="0 0 24 24" fill="currentColor" className={cn("size-5", className)}>
      <path d={icon.path} />
    </svg>
  )
}
