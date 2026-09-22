import type { ReactNode } from 'react'

// DESIGN-SYSTEM §2/§5: section heading — 17px/800, tight tracking (showcase).
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-section font-extrabold tracking-tight">{children}</h2>
}

// DESIGN-SYSTEM §5: list — cards separated by gap-3.
export function List({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}
