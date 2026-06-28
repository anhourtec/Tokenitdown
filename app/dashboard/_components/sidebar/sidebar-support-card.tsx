import { LifeBuoy } from "lucide-react"
import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SidebarSupportCard() {
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="truncate text-sm">Looking for something more?</CardTitle>
        <CardDescription className="line-clamp-2">
          Open an issue or reach out on&nbsp;
          <Link
            href="https://github.com/anhourtec/tokenitdown"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the TokenItDown repository on GitHub"
            className="text-foreground inline-flex items-center"
          >
            <LifeBuoy aria-hidden className="size-3" />
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
