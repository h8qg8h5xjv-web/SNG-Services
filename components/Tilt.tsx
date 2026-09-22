import type { ReactNode } from 'react'

// DESIGN-SYSTEM: 3D tilt removed (flat, mobile-first). Kept as a thin pass-through
// so existing call sites keep working; it renders its children with no motion.
export default function Tilt({
  className = '',
  children,
}: {
  maxDeg?: number
  translateZ?: number
  perspective?: 'near' | 'far'
  className?: string
  children: ReactNode
}) {
  return <div className={className}>{children}</div>
}
