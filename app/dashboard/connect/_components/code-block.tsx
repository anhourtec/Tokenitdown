"use client"

import { Check, Copy } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/** A code block with a copy-to-clipboard button. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy — select and copy manually.")
    }
  }

  return (
    <div className="relative">
      {label && (
        <p className="mb-1 text-[0.7rem] text-muted-foreground uppercase tracking-wide">{label}</p>
      )}
      <div className="relative rounded-lg border bg-muted/40">
        <pre className="overflow-x-auto p-3 pr-12 font-mono text-foreground text-xs leading-relaxed">
          {code}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label="Copy to clipboard"
          className="absolute top-1.5 right-1.5"
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
