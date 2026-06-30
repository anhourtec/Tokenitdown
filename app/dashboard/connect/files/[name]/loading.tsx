import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function Loading() {
  return (
    <div className="@container/main flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 md:p-8">
        <Skeleton className="h-7 w-56" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 4 === 0 ? "w-1/3" : i % 3 === 0 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  )
}
