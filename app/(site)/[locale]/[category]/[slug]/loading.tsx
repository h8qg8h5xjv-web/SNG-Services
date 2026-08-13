import Header from '@/components/Header'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ProviderLoading() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12">
        <Skeleton className="mt-4 aspect-[16/9] w-full rounded-2xl" />
        <div className="space-y-3 py-5">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    </>
  )
}
