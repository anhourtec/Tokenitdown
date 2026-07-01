import { ConnectSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeletons"

export default function Loading() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeaderSkeleton />
      <ConnectSkeleton />
    </div>
  )
}
