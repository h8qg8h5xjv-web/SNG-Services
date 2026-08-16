import type { ReactNode } from 'react'

// DESIGN-SYSTEM §5: section heading — 18px/600 with 16px below.
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-h2 font-semibold">{children}</h2>
}

// DESIGN-SYSTEM §5: list — cards separated by gap-3.
export function List({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}
