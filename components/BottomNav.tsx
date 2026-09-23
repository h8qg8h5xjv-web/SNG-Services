'use client'

import { useTranslations } from 'next-intl'
import {
  IconSearch,
  IconMapPin,
  IconCalendarEvent,
  IconHeart,
  IconUser,
} from '@tabler/icons-react'
import { Link, usePathname } from '@/i18n/navigation'

type IconComponent = React.ComponentType<{ className?: string; stroke?: number }>

// DESIGN-SYSTEM §2: five-item sticky bottom nav (mobile only). White, top border,
// active item in the accent, safe-area aware.
const ITEMS: { href: string; labelKey: string; Icon: IconComponent }[] = [
  { href: '/', labelKey: 'nav.search', Icon: IconSearch },
  { href: '/near', labelKey: 'nav.near', Icon: IconMapPin },
  { href: '/events', labelKey: 'nav.events', Icon: IconCalendarEvent },
  { href: '/saved', labelKey: 'nav.favorites', Icon: IconHeart },
  { href: '/cabinet', labelKey: 'nav.cabinet', Icon: IconUser },
]

export default function BottomNav() {
  const t = useTranslations()
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white sm:hidden">
      <ul className="mx-auto flex max-w-md items-stretch">
        {ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-label transition-colors ${
                  active ? 'font-semibold text-accent' : 'text-slate-500'
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
