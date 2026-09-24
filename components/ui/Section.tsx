import type { ReactNode } from 'react'

// v2 block heading inside a day page (DEMO_MAP §5.3 `.h3`): Unbounded 20–24px.
export function SectionHeading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`h3 mb-4 ${className}`}>{children}</h2>
}

export function List({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}
