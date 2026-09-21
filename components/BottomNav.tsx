'use client'

import { useTranslations } from 'next-intl'
import {
  IconHome,
  IconCalendarEvent,
  IconCalendarCheck,
  IconUser,
} from '@tabler/icons-react'
import { Link, usePathname } from '@/i18n/navigation'

type IconComponent = React.ComponentType<{ className?: string; stroke?: number }>

const ITEMS: { href: string; labelKey: string; Icon: IconComponent }[] = [
  { href: '/', labelKey: 'nav.home', Icon: IconHome },
  { href: '/events', labelKey: 'nav.events', Icon: IconCalendarEvent },
  { href: '/bookings', labelKey: 'nav.bookings', Icon: IconCalendarCheck },
  { href: '/profile', labelKey: 'nav.profile', Icon: IconUser },
]

export default function BottomNav() {
  const t = useTranslations()
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    // Floating pill nav (DESIGN-SYSTEM §3): hovers 12px off each edge, mobile only.
    <nav className="floating-bottom fixed inset-x-3 z-30 sm:hidden">
      <ul className="mx-auto flex max-w-md items-center rounded-full border border-slate-200 bg-white p-1">
        {ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              {/* min-h-14: off-scale on purpose — the nav's own touch height (§4). */}
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-full text-meta transition-colors ${
                  active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-500'
                }`}
              >
                {/* 24px — navigation icon (DESIGN-SYSTEM §7). */}
                <Icon className="h-6 w-6" stroke={1.5} />
                {t(labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
