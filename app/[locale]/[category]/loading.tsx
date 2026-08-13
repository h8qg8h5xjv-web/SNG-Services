import Header from '@/components/Header'
import { Skeleton, ProviderGridSkeleton } from '@/components/ui/Skeleton'

export default function CategoryLoading() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <div className="space-y-2 py-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <ProviderGridSkeleton />
      </main>
    </>
  )
}
