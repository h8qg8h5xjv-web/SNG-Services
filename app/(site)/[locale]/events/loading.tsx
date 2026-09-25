import { Skeleton } from '@/components/ui/Skeleton'

// Night header strip + grey event rows while the page streams in.
export default function EventsLoading() {
  return (
    <>
      <div className="nhead night">
        <div className="wrap">
          <Skeleton dark className="h-12 w-56" />
          <Skeleton dark className="mt-4 h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="wrap page pt-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card erow mb-3">
            <Skeleton dark className="h-24" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
