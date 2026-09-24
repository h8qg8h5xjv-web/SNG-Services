import { Skeleton, ProviderGridSkeleton } from '@/components/ui/Skeleton'

export default function SavedLoading() {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pt-4">
        <Skeleton className="h-8 w-40" />
        <div className="mt-4">
          <ProviderGridSkeleton count={4} />
        </div>
      </div>
    </>
  )
}
