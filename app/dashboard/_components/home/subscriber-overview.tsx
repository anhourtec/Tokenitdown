import { formatDistanceToNow } from "date-fns"
import { ArrowRight, Bot, FileText, Globe } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DashboardFormatSlice,
  DashboardRecentItem,
  DashboardTopSaver,
} from "@/lib/dashboard-stats"

const compact = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)

const sourceLabel = (t: string) => (t === "url" ? "Web / URL" : "Files")

export function SubscriberOverview({
  recent,
  byFormat,
  topSavers,
}: {
  recent: DashboardRecentItem[]
  byFormat: DashboardFormatSlice[]
  topSavers: DashboardTopSaver[]
}) {
  const total = byFormat.reduce((a, b) => a + b.count, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="leading-none">Recent conversions</CardTitle>
          <CardDescription>Your latest documents and the agent activity behind them.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-start gap-2 py-6">
              <p className="text-muted-foreground text-sm">No conversions yet.</p>
              <Link
                href="/dashboard/convert"
                className="inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
              >
                Convert your first document
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              {recent.map((item) => {
                const Icon = item.sourceType === "url" ? Globe : FileText
                const saved = Math.max(0, item.rawTokens - item.cleanTokens)
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/library?doc=${item.id}`}
                        className="block truncate font-medium text-sm hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="truncate text-muted-foreground text-xs">{item.sourceName}</p>
                    </div>
                    {item.fromAgent && (
                      <Badge variant="secondary" className="gap-1">
                        <Bot className="size-3" />
                        Agent
                      </Badge>
                    )}
                    <div className="shrink-0 text-right">
                      <div className="font-medium text-sm tabular-nums">−{compact(saved)} tok</div>
                      <div className="text-muted-foreground text-xs">
                        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="leading-none">By source</CardTitle>
            <CardDescription>How your conversions break down.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {total === 0 ? (
              <p className="text-muted-foreground text-sm">No conversions yet.</p>
            ) : (
              byFormat.map((f) => {
                const pct = Math.round((f.count / total) * 100)
                return (
                  <div key={f.sourceType} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{sourceLabel(f.sourceType)}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {f.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="leading-none">Top savers</CardTitle>
            <CardDescription>Where cleaning removed the most tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            {topSavers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No token savings recorded yet.</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {topSavers.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="grid size-5 shrink-0 place-items-center rounded text-[0.7rem] text-muted-foreground tabular-nums ring-1 ring-foreground/10">
                      {i + 1}
                    </span>
                    <Link
                      href={`/dashboard/library?doc=${d.id}`}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                      title={d.title}
                    >
                      {d.title}
                    </Link>
                    <span className="shrink-0 font-medium text-sm tabular-nums">−{compact(d.saved)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
