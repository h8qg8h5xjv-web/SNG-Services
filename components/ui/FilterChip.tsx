import type { ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'

// DESIGN-SYSTEM §5: filter chip — rounded-full outline pill (1.5px slate-900),
// slate-900 text; active = solid slate-900 fill. min-h-11 keeps a 44px touch
// target (§6). `chevron` adds a ⌄ when the chip opens a choice (§2).
const base =
  'inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-meta font-semibold transition-colors'
const state = (active: boolean) =>
  active ? 'bg-slate-900 text-white' : 'border-medium border-slate-900 text-slate-900'

export function FilterChip({
  active = false,
  onClick,
  className = '',
  chevron = false,
  children,
}: {
  active?: boolean
  onClick?: () => void
  className?: string
  chevron?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`${base} ${state(active)} ${className}`}>
      {children}
      {chevron && <IconChevronDown className="h-5 w-5" stroke={2} />}
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
