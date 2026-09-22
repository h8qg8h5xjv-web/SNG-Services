'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, usePathname } from '@/i18n/navigation'

const TABS = [
  { href: '/business/requests', key: 'requests' },
  { href: '/business/profile', key: 'profile' },
  { href: '/business/languages', key: 'languages' },
  { href: '/business/services', key: 'services' },
  { href: '/business/bookings', key: 'bookings' },
  { href: '/business/schedule', key: 'schedule' },
] as const

// Cabinet tab bar (§2): horizontal scrollable pills, active = slate-900 fill —
// the design-system chip look. Preserves the active provider (?p) across tabs.
export default function CabinetTabs({ newCount }: { newCount: number }) {
  const t = useTranslations('business.tabs')
  const pathname = usePathname()
  const params = useSearchParams()
  const p = params.get('p')
  const suffix = p ? `?p=${p}` : ''

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.key}
            href={`${tab.href}${suffix}`}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 text-meta font-semibold transition-colors ${
              active ? 'bg-slate-900 text-white' : 'border-medium border-slate-900 text-slate-900'
            }`}
          >
            {t(tab.key)}
            {tab.key === 'requests' && newCount > 0 && (
              <span
                className={`rounded-full px-1.5 text-meta ${active ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
              >
                {newCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
