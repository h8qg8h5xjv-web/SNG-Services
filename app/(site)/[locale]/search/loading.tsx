import { ProviderGridSkeleton, Skeleton } from '@/components/ui/Skeleton'

// Night header strip + grey result rows while the page streams in.
export default function Loading() {
  return (
    <>
      <div className="nhead night">
        <div className="wrap">
          <Skeleton dark className="h-4 w-40" />
          <Skeleton dark className="mt-5 h-12 w-72 max-w-full" />
          <Skeleton dark className="mt-4 h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="wrap page pt-8">
        <ProviderGridSkeleton count={4} />
      </div>
    </>
  )
}
