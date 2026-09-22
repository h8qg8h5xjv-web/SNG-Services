// DESIGN-SYSTEM §5/§8: skeletons are static grey rectangles (no animation).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-slate-100 ${className}`} aria-hidden />
}

// Mirrors the §5 horizontal card: avatar + three text lines.
export function ProviderCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-card border border-slate-200 bg-white p-3">
      <Skeleton className="size-16 shrink-0 rounded-photo sm:size-21" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function ProviderGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  )
}
