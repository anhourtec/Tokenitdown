"use client"

import { ArrowDownRight } from "lucide-react"
import { Bar, BarChart, type BarShapeProps, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export interface TopSaversProps {
  /** Per-document saved tokens, chronological (the mini bar strip). */
  chart: { value: number }[]
  /** Top documents by savings (the 2×2 grid). */
  leaders: { name: string; saved: number }[]
  totalSaved: number
  savedPct: number
}

const chartConfig = {
  value: { color: "var(--chart-1)", label: "Tokens saved" },
} satisfies ChartConfig

function compact(n: number): string {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

const CELL_CLASSES = [
  "border-border/50 border-r border-b pt-1 pr-5 pb-4",
  "border-border/50 border-b pt-1 pb-4 pl-5",
  "border-border/50 border-r pt-4 pr-5 pb-1",
  "pt-4 pb-1 pl-5",
]

export function TopSavers({ chart, leaders, totalSaved, savedPct }: TopSaversProps) {
  const max = Math.max(1, ...chart.map((c) => c.value))

  // Opacity scales with savings; zero-saving docs show a thin destructive baseline.
  function SaverBar(props: BarShapeProps) {
    const { height, payload, width, x, y } = props
    const value = (payload as { value?: number } | undefined)?.value ?? 0
    const xv = Number(x)
    const yv = Number(y)
    const w = Number(width)
    const h = Number(height)
    const fill = "var(--color-value)"
    const opacity = value >= max * 0.66 ? 0.95 : 0.4
    const baselineFill = value === 0 ? "var(--destructive)" : fill
    const baselineOpacity = value === 0 ? 1 : opacity
    const barH = Math.max(0, h - 4)
    return (
      <g>
        <rect x={xv} y={yv + h - 2} width={w} height={2} rx={1} fill={baselineFill} fillOpacity={baselineOpacity} />
        {value > 0 && barH > 0 ? (
          <rect x={xv} y={yv} width={w} height={barH} rx={2} fill={fill} fillOpacity={opacity} />
        ) : null}
      </g>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">Top documents by savings</CardTitle>
        <CardDescription>Where cleaning removed the most tokens</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl leading-none tracking-tight tabular-nums">{compact(totalSaved)}</span>
            <span className="text-muted-foreground text-sm">tokens saved</span>
          </div>
          {savedPct > 0 && (
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              <ArrowDownRight />
              {savedPct}%
            </Badge>
          )}
        </div>

        {chart.length > 0 && (
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={chart} margin={{ bottom: 0, left: 0, right: 0, top: 0 }} barCategoryGap={3}>
              <XAxis dataKey="value" hide />
              <YAxis hide domain={[0, max]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="value" fill="var(--color-value)" shape={SaverBar} />
            </BarChart>
          </ChartContainer>
        )}

        {leaders.length > 0 ? (
          <div className="grid grid-cols-2">
            {leaders.slice(0, 4).map((d, i) => (
              <div key={d.name + i} className={`flex items-center gap-3 ${CELL_CLASSES[i]}`}>
                <span className="grid size-5 shrink-0 place-items-center rounded text-[0.7rem] text-muted-foreground tabular-nums ring-1 ring-foreground/10">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm" title={d.name}>
                  {d.name}
                </span>
                <span className="text-sm tabular-nums">{compact(d.saved)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No token savings recorded yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
