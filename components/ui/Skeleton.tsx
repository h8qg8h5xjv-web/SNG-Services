// DESIGN-SYSTEM §5/§8: skeletons are static grey rectangles (no animation).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-slate-100 ${className}`} aria-hidden />
}

export function ProviderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Skeleton className="aspect-photo w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

export function ProviderGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  )
}
