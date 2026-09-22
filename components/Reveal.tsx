import type { ReactNode } from 'react'

// DESIGN-SYSTEM: scroll-reveal removed (content is visible immediately). Kept as a
// thin pass-through so existing call sites keep working.
export default function Reveal({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={className}>{children}</div>
}
