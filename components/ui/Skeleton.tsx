// v2 skeletons (DEMO_MAP §8.3): static grey rows and dark panes, no shimmer.
export function Skeleton({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return <div className={`skel ${dark ? 'dark' : ''} ${className}`} aria-hidden />
}

// Mirrors the business row: thumb + three text lines.
export function ProviderCardSkeleton() {
  return (
    <div className="card flex gap-4 p-3.5">
      <Skeleton dark className="h-18 w-18 shrink-0 tablet:h-26 tablet:w-28" />
      <div className="flex-1 space-y-2.5 py-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}

export function ProviderGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  )
}
