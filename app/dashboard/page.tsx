import { MetricCards } from "./_components/home/metric-cards"
import { PerformanceOverview } from "./_components/home/performance-overview"
import { SubscriberOverview } from "./_components/home/subscriber-overview"

export const metadata = {
  title: "Dashboard · TokenItDown",
}

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards />
      <PerformanceOverview />
      <SubscriberOverview />
    </div>
  )
}
