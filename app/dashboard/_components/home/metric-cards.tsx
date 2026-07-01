import { Bot, FileText, HardDrive, Sparkles, TrendingDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/dashboard-stats"

const compact = (n: number) =>
  Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)
const full = (n: number) => Intl.NumberFormat("en").format(n)

function formatBytes(n: number): string {
  if (n <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function MetricCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      icon: FileText,
      label: "Documents converted",
      value: full(stats.documents),
      sub: "Across every format and URL",
    },
    {
      icon: Sparkles,
      label: "Tokens saved",
      value: compact(stats.tokensSaved),
      badge: stats.reductionPct > 0 ? `−${stats.reductionPct}%` : undefined,
      sub: `${compact(stats.rawTokens)} → ${compact(stats.cleanTokens)} tokens after cleaning`,
    },
    {
      icon: Bot,
      label: "Agent conversions",
      value: full(stats.agentConversions),
      sub: "Made by AI agents via your API keys",
    },
    {
      icon: HardDrive,
      label: "Originals stored",
      value: formatBytes(stats.storedBytes),
      sub: "Source files kept on the local volume",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <c.icon className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>{c.label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{c.value}</div>
              {c.badge && (
                <Badge>
                  <TrendingDown className="size-3" />
                  {c.badge}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
