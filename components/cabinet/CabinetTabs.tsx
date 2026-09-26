'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

const TABS = [
  { href: '/cabinet/cards', key: 'cards', authOnly: true },
  { href: '/cabinet/requests', key: 'requests', authOnly: false },
  { href: '/cabinet/bookings', key: 'bookings', authOnly: false },
  { href: '/cabinet/account', key: 'account', authOnly: false },
] as const

// v2 section tabs (DEMO_MAP §4 «Tabs»): ink underline on the current one. The
// page slides towards the tab you pick (step / step-back). Cards only when
// signed in.
export default function CabinetTabs({
  loggedIn,
  incomingCount,
}: {
  loggedIn: boolean
  incomingCount: number
}) {
  const t = useTranslations('cabinet')
  const tc = useTranslations('cabinet2')
  const pathname = usePathname()
  const tabs = TABS.filter((tab) => loggedIn || !tab.authOnly)
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const current = tabs.findIndex((tab) => isActive(tab.href))
  const navRef = useRef<HTMLElement | null>(null)

  // On a narrow screen the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    const nav = navRef.current
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !el) return
    const left = el.offsetLeft - nav.offsetLeft
    if (left < nav.scrollLeft || left + el.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - (nav.clientWidth - el.offsetWidth) / 2
    }
  }, [pathname])

  return (
    <nav ref={navRef} className="tabs" aria-label={tc('sections')}>
      {tabs.map((tab, i) => {
        const active = i === current
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            data-kind={i < current ? 'step-back' : 'step'}
          >
            {t(`tabs.${tab.key}`)}
            {tab.key === 'requests' && incomingCount > 0 && (
              <span className="n" aria-label={tc('newCount', { n: incomingCount })}>
                {incomingCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
