import { Skeleton, ProviderGridSkeleton } from '@/components/ui/Skeleton'

export default function SavedLoading() {
  return (
    <>
      <div className="nhead night">
        <div className="wrap">
          <Skeleton dark className="h-12 w-56" />
          <Skeleton dark className="mt-4 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="wrap page pt-8">
        <ProviderGridSkeleton count={4} />
      </div>
    </>
  )
}
