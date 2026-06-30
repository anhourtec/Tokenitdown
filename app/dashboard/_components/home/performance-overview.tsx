"use client"

import { format, parseISO } from "date-fns"
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DashboardDailyPoint } from "@/lib/dashboard-stats"

const chartConfig = {
  tokensSaved: { label: "Tokens saved", color: "var(--chart-1)" },
  conversions: { label: "Conversions", color: "var(--chart-2)" },
} satisfies ChartConfig

export function PerformanceOverview({ data }: { data: DashboardDailyPoint[] }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Conversion activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Documents converted and tokens saved over the last 30 days
          </span>
          <span className="@[540px]/card:hidden">Last 30 days</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={data} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillTokensSaved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-tokensSaved)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--color-tokensSaved)" stopOpacity={0.04} />
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
                parseISO(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis yAxisId="tokens" hide />
            <YAxis yAxisId="conversions" orientation="right" hide />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-52"
                  indicator="line"
                  labelFormatter={(value) => format(parseISO(value as string), "d MMMM yyyy")}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

            <Area
              yAxisId="tokens"
              dataKey="tokensSaved"
              type="natural"
              fill="url(#fillTokensSaved)"
              stroke="var(--color-tokensSaved)"
              strokeWidth={1.4}
              dot={false}
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="conversions"
              dataKey="conversions"
              fill="var(--color-conversions)"
              radius={[3, 3, 0, 0]}
              barSize={10}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
