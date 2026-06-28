"use client"

import { format, parseISO, subDays } from "date-fns"
import { useMemo, useState } from "react"
import { Area, CartesianGrid, ComposedChart, Line, XAxis } from "recharts"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface SavingsPoint {
  date: string
  saved: number
  cumulative: number
}

const chartConfig = {
  cumulative: {
    label: "Cumulative saved",
    color: "var(--chart-1)",
  },
  saved: {
    label: "Saved per day",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function SavingsChart({ data }: { data: SavingsPoint[] }) {
  const [range, setRange] = useState<"all" | "90d" | "30d">("all")

  const chartData = useMemo(() => {
    if (range === "all" || data.length === 0) return data
    const days = range === "90d" ? 90 : 30
    const last = parseISO(data[data.length - 1]!.date)
    const cutoff = subDays(last, days)
    return data.filter((d) => parseISO(d.date) >= cutoff)
  }, [data, range])

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle className="leading-none">Tokens saved over time</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">Cumulative tokens removed by the cleaning pass across your library</span>
          <span className="@[540px]/card:hidden">Cumulative tokens removed</span>
        </CardDescription>
        <CardAction>
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Period</SelectLabel>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={chartData} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={48}
              tickFormatter={(value) =>
                parseISO(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-50"
                  indicator="line"
                  labelFormatter={(value) => format(parseISO(value), "d MMMM yyyy")}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

            <Area
              dataKey="cumulative"
              type="natural"
              fill="url(#fillCumulative)"
              stroke="var(--color-cumulative)"
              strokeWidth={1.25}
              dot={false}
              fillOpacity={1}
            />
            <Line dataKey="saved" type="natural" stroke="var(--color-saved)" strokeWidth={1.4} dot={false} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
