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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-5xl">
        {ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-meta ${
                  active ? 'text-slate-900' : 'text-slate-900/55'
                }`}
              >
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
