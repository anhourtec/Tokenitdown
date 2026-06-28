import { ArrowDownRight } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { listDocuments } from "@/lib/documents"

import { SavingsChart, type SavingsPoint } from "./_components/savings-chart"
import { TopSavers } from "./_components/top-savers"

export const metadata = {
  title: "Analytics · TokenItDown",
}

function pct(raw: number, clean: number): number {
  if (raw <= 0) return 0
  return Math.max(0, Math.round(((raw - clean) / raw) * 1000) / 10)
}

function compact(n: number): string {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const docs = await listDocuments(session.user.id)
  const rawTotal = docs.reduce((s, d) => s + (d.rawTokens ?? 0), 0)
  const cleanTotal = docs.reduce((s, d) => s + (d.cleanTokens ?? 0), 0)
  const saved = Math.max(0, rawTotal - cleanTotal)
  const savedPct = pct(rawTotal, cleanTotal)

  // Cumulative tokens saved per day, oldest → newest.
  const byDay = new Map<string, number>()
  for (const d of docs) {
    const day = new Date(d.createdAt).toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + Math.max(0, (d.rawTokens ?? 0) - (d.cleanTokens ?? 0)))
  }
  let cumulative = 0
  const chartData: SavingsPoint[] = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailySaved]) => {
      cumulative += dailySaved
      return { date, saved: dailySaved, cumulative }
    })

  // Bar strip: saved tokens per document, chronological, most recent ~24.
  const savedOf = (d: (typeof docs)[number]) => Math.max(0, (d.rawTokens ?? 0) - (d.cleanTokens ?? 0))
  const chronological = docs.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  const topChart = chronological.slice(-24).map((d) => ({ value: savedOf(d) }))

  // Leader grid: top 4 documents by savings.
  const leaders = docs
    .map((d) => ({ name: d.title, saved: savedOf(d) }))
    .filter((d) => d.saved > 0)
    .sort((a, b) => b.saved - a.saved)
    .slice(0, 4)

  const kpis = [
    { label: "Documents", value: docs.length.toLocaleString(), foot: "in your library" },
    { label: "Tokens before", value: compact(rawTotal), foot: "raw engine output" },
    { label: "Tokens after", value: compact(cleanTotal), foot: `from ${compact(rawTotal)} • after cleaning` },
    {
      label: "Tokens saved",
      value: compact(saved),
      foot: `${savedPct}% smaller overall`,
      delta: `−${savedPct}%`,
    },
  ]

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-2xl tracking-tight">Analytics</h2>
        <p className="text-muted-foreground text-sm">How much the cleaning pass has trimmed across your library.</p>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-medium text-sm">No data yet</p>
            <p className="text-muted-foreground text-sm">
              Convert a file or URL on{" "}
              <Link className="text-primary underline" href="/dashboard/convert">
                Convert
              </Link>{" "}
              to start tracking token savings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connected KPI strip */}
          <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
            <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:border-0 *:data-[slot=card]:shadow-none sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4 [&>*:nth-child(3)]:max-sm:border-t [&>*:nth-child(3)]:border-t sm:[&>*:nth-child(3)]:border-t xl:[&>*:nth-child(3)]:border-t-0">
              {kpis.map((k) => (
                <Card key={k.label}>
                  <CardHeader>
                    <CardTitle className="font-normal text-muted-foreground text-sm">{k.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-2xl leading-none tracking-tight tabular-nums">{k.value}</div>
                      {k.delta && (
                        <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                          <ArrowDownRight />
                          {k.delta}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{k.foot}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Chart + top savers */}
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <SavingsChart data={chartData} />
            </div>
            <div className="xl:col-span-4">
              <TopSavers chart={topChart} leaders={leaders} totalSaved={saved} savedPct={savedPct} />
            </div>
          </div>

          {/* Per-document table */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="font-normal">Per-document savings</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[26rem] overflow-auto">
                <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
                  <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-border/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8">Document</TableHead>
                      <TableHead className="h-8 w-28 text-right font-normal">Before</TableHead>
                      <TableHead className="h-8 w-28 text-right font-normal">After</TableHead>
                      <TableHead className="h-8 w-20 text-right font-normal">Saved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr]:border-border/50">
                    {docs.map((d) => {
                      const p = pct(d.rawTokens ?? 0, d.cleanTokens ?? 0)
                      return (
                        <TableRow key={d.id} className="hover:bg-transparent">
                          <TableCell className="max-w-0 truncate py-3 font-medium" title={d.title}>
                            <Link href={`/dashboard/library?doc=${d.id}`} className="hover:text-primary hover:underline">
                              {d.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{(d.rawTokens ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {(d.cleanTokens ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary tabular-nums">
                            {p > 0 ? `−${p}%` : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
