import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

// DESIGN-SYSTEM §5: filter chip — rounded-full, 13px, teal when active.
const base = 'inline-flex min-h-9 items-center rounded-full px-3 text-meta transition-colors'
const state = (active: boolean) =>
  active ? 'bg-teal-700 text-white' : 'border border-slate-200 text-slate-900'

export function FilterChip({
  active = false,
  onClick,
  className = '',
  children,
}: {
  active?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`${base} ${state(active)} ${className}`}>
      {children}
    </button>
  )
}

export function FilterChipLink({
  active = false,
  href,
  children,
}: {
  active?: boolean
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={`${base} ${state(active)}`}>
      {children}
    </Link>
  )
}
