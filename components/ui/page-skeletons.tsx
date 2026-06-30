import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Page title + subtitle placeholder. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  )
}

function rows(n: number) {
  return Array.from({ length: n })
}

/**
 * Two-pane explorer skeleton (Library / Documents / RAG): a left list and a
 * right content pane. `topbar` adds a search+filter row above (Library);
 * `leftSearch` puts the search inside the left panel (Documents / RAG).
 */
export function ExplorerSkeleton({ topbar, leftSearch }: { topbar?: boolean; leftSearch?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {topbar && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-xs" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        {/* Left list */}
        <div className="hidden w-64 shrink-0 flex-col gap-2 border-r p-3 sm:flex">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          {leftSearch && <Skeleton className="h-8 w-full" />}
          <div className="mt-1 flex flex-col gap-1.5">
            {rows(8).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
        {/* Right pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b p-3">
            <Skeleton className="h-5 w-48" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5">
            {rows(9).map((_, i) => (
              <Skeleton key={i} className={cn("h-4", i % 4 === 0 ? "w-1/3" : i % 3 === 0 ? "w-2/3" : "w-full")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Home / analytics-style metric card grid. */
function MetricGrid({ count = 4, withIcon }: { count?: number; withIcon?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {rows(count).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          {withIcon && <Skeleton className="size-7 rounded-lg" />}
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows: n = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border p-4">
      <Skeleton className="mb-3 h-5 w-40" />
      <div className="flex flex-col gap-1">
        {rows(n).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Home dashboard: metric cards + big chart + table. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <MetricGrid withIcon />
      <div className="rounded-xl border p-4">
        <Skeleton className="mb-2 h-5 w-40" />
        <Skeleton className="mb-4 h-3 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
      <TableSkeleton />
    </div>
  )
}

/** Analytics: connected KPI strip + chart + top-savers + table. */
export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 xl:grid-cols-4">
        {rows(4).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-xl border p-4 xl:col-span-8">
          <Skeleton className="mb-2 h-5 w-44" />
          <Skeleton className="mb-4 h-3 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-4 xl:col-span-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
      <TableSkeleton />
    </div>
  )
}

/** Settings: stacked preference cards. */
export function SettingsSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {rows(4).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Account: profile (avatar + name), email, and password cards. */
export function AccountSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="flex justify-end border-t pt-4">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="flex justify-end border-t pt-4">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-24" />
        {rows(3).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full max-w-sm" />
        ))}
        <div className="flex justify-end border-t pt-4">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  )
}

/** Connect editor: editor-tab bar + code block, then tool list and host cards. */
export function ConnectSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {/* Install card: tab row + code block */}
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-72 max-w-full" />
        <div className="flex gap-2">
          {rows(4).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      {/* Tools card */}
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-44" />
        {rows(3).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full max-w-lg" />
          </div>
        ))}
      </div>
      {/* Host-it card */}
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-80 max-w-full" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  )
}

/** Convert: the dropzone / hub area. */
export function ConvertSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border p-6">
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  )
}
