import { Skeleton, ProviderGridSkeleton } from '@/components/ui/Skeleton'

export default function SearchLoading() {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8">
        <div className="space-y-2 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <ProviderGridSkeleton />
      </div>
    </>
  )
}
