import type { ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'

// v2 day chips (DEMO_MAP §4): `tog` for filter toggles (ink when on), `dchip`
// for choices and suggestions. Night chips (.chip) are used directly on night
// surfaces. Coarse pointers get 44px targets from the CSS.
type Look = 'tog' | 'dchip'

export function FilterChip({
  active = false,
  onClick,
  className = '',
  chevron = false,
  look = 'tog',
  children,
}: {
  active?: boolean
  onClick?: () => void
  className?: string
  chevron?: boolean
  look?: Look
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${look} ${className}`}>
      {children}
      {chevron && <IconChevronDown className="h-4 w-4" stroke={2} aria-hidden="true" />}
    </button>
  )
}

export function FilterChipLink({
  active = false,
  href,
  look = 'tog',
  scroll,
  children,
}: {
  active?: boolean
  href: string
  look?: Look
  scroll?: boolean
  children: ReactNode
}) {
  return (
    <Link href={href} scroll={scroll} aria-current={active ? 'page' : undefined} className={look}>
      {children}
    </Link>
  )
}
