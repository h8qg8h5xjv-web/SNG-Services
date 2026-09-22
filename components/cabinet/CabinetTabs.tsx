'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

const TABS = [
  { href: '/cabinet/cards', key: 'cards', authOnly: true },
  { href: '/cabinet/requests', key: 'requests', authOnly: false },
  { href: '/cabinet/bookings', key: 'bookings', authOnly: false },
  { href: '/cabinet/account', key: 'account', authOnly: false },
] as const

// Unified cabinet tabs (design-system pills). Cards is hidden when signed out.
export default function CabinetTabs({
  loggedIn,
  incomingCount,
}: {
  loggedIn: boolean
  incomingCount: number
}) {
  const t = useTranslations('cabinet.tabs')
  const pathname = usePathname()
  const tabs = TABS.filter((tab) => loggedIn || !tab.authOnly)

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 text-meta font-semibold transition-colors ${
              active ? 'bg-slate-900 text-white' : 'border-medium border-slate-900 text-slate-900'
            }`}
          >
            {t(tab.key)}
            {tab.key === 'requests' && incomingCount > 0 && (
              <span
                className={`rounded-full px-1.5 text-meta ${active ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
              >
                {incomingCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
