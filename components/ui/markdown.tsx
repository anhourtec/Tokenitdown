import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/**
 * Renders Markdown as formatted HTML (GitHub-flavored) with clean, theme-aware
 * typography — headings, bold/italic, lists, tables, links, code, blockquotes.
 * Uses Tailwind Typography `prose` so it adapts to light/dark automatically.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // GitHub-ish tuning
        "prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:mt-0 prose-h1:border-b prose-h1:pb-2",
        "prose-h2:text-xl prose-h2:border-b prose-h2:pb-1.5",
        "prose-h3:text-lg",
        "prose-a:text-primary prose-a:font-medium hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted/60 prose-pre:text-foreground",
        "prose-img:rounded-lg prose-img:border",
        "prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:font-normal prose-blockquote:not-italic",
        "prose-hr:border-border",
        // tables (GFM)
        "prose-table:block prose-table:overflow-x-auto prose-table:w-fit prose-table:max-w-full",
        "prose-th:border prose-th:border-border prose-th:bg-muted/60 prose-th:px-3 prose-th:py-1.5 prose-th:text-left",
        "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export default Markdown
