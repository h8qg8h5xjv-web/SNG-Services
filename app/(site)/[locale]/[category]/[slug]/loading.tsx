import { Skeleton } from '@/components/ui/Skeleton'

// Listing skeleton: the gallery as a dark pane, grey lines, the aside card.
export default function ProviderLoading() {
  return (
    <div className="wrap page">
      <div className="crumbs">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="lst">
        <div>
          <Skeleton dark className="mb-8 h-80 w-full rounded-2xl" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="mt-4 h-4 w-1/3" />
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
        <div className="card week">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="mt-6 h-14 w-full" />
          <Skeleton dark className="mt-6 h-32 w-full" />
        </div>
      </div>
    </div>
  )
}
