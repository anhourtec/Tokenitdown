import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { FileCard } from "@/components/ui/file-card"

import { CONVERT_FORMATS } from "./formats"

export const metadata = {
  title: "Convert · TokenItDown",
}

export default function ConvertHubPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Convert to Markdown</h2>
        <p className="text-muted-foreground text-sm">
          Pick a source type to get clean, LLM-ready Markdown. Or jump straight in from the sidebar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CONVERT_FORMATS.map((f) => (
          <Link key={f.slug} href={`/dashboard/convert/${f.slug}`} className="group">
            <Card className="h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
              <CardContent className="flex h-full items-center gap-4 pt-6">
                <div className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
                  <FileCard formatFile={f.cards[0] ?? "txt"} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-1 font-medium">
                    {f.title}
                    <ArrowRight className="size-4 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-muted-foreground text-sm">{f.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
