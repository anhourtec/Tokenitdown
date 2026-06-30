import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { getDashboardStats } from "@/lib/dashboard-stats"

import { MetricCards } from "./_components/home/metric-cards"
import { PerformanceOverview } from "./_components/home/performance-overview"
import { SubscriberOverview } from "./_components/home/subscriber-overview"

export const metadata = {
  title: "Dashboard · TokenItDown",
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const stats = await getDashboardStats(session.user.id)

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards stats={stats} />
      <PerformanceOverview data={stats.daily} />
      <SubscriberOverview recent={stats.recent} byFormat={stats.byFormat} topSavers={stats.topSavers} />
    </div>
  )
}
