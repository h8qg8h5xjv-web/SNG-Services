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
import { navSection, type NavSection } from '@/lib/nav/section'

type IconComponent = React.ComponentType<{ className?: string; stroke?: number }>

// Floating glass tab bar, phones only (DEMO_MAP §3.0). «Поиск» is home and is
// also active on /search; the active tab is white with an amber icon.
const ITEMS: { href: string; labelKey: string; Icon: IconComponent; sections: NavSection[] }[] = [
  { href: '/', labelKey: 'nav.search', Icon: IconSearch, sections: ['home', 'search'] },
  { href: '/near', labelKey: 'nav.near', Icon: IconMapPin, sections: ['near'] },
  { href: '/events', labelKey: 'nav.events', Icon: IconCalendarEvent, sections: ['events'] },
  { href: '/saved', labelKey: 'nav.favorites', Icon: IconHeart, sections: ['saved'] },
  { href: '/cabinet', labelKey: 'nav.cabinet', Icon: IconUser, sections: ['cabinet'] },
]

export default function BottomNav() {
  const t = useTranslations()
  const section = navSection(usePathname())

  return (
    <nav className="tabbar" aria-label={t('nav.navigation')}>
      {ITEMS.map(({ href, labelKey, Icon, sections }) => (
        <Link key={href} href={href} aria-current={sections.includes(section) ? 'page' : undefined}>
          <Icon stroke={1.75} />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  )
}
