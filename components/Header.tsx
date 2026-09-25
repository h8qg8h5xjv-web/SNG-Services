'use client'

import { useLocale, useTranslations } from 'next-intl'
import { IconSearch, IconCalendarEvent, IconUser } from '@tabler/icons-react'
import { Link, usePathname } from '@/i18n/navigation'
import { localeConfigs } from '@/i18n/locales'
import { navSection } from '@/lib/nav/section'

// RU first: the audience reads Russian first (demo order).
const LOCALES = localeConfigs
  .filter((l) => l.enabled)
  .sort((a, b) => Number(b.code === 'ru') - Number(a.code === 'ru'))

// Night header (DEMO_MAP §3.0): logo window, section links, search / bookings /
// cabinet icons, RU/EN switch. Sticky on dusk; on home it is transparent and
// sits over the hero's city.
export default function Header() {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const section = navSection(pathname)
  const current = (s: string) => (section === s ? 'page' : undefined)

  return (
    <header className={section === 'home' ? 'top is-home' : 'top'}>
      <div className="wrap nav">
        <Link href="/" className="logo" aria-label={`SNG ${t('common.city')} — ${t('nav.home')}`}>
          <span className="logo-win" aria-hidden="true" />
          SNG <small>{t('common.city')}</small>
        </Link>

        <nav className="nav-links" aria-label={t('nav.mainMenu')}>
          <Link href="/catalog" aria-current={current('catalog')}>
            {t('nav.catalog')}
          </Link>
          <Link href="/near" className="opt-link" aria-current={current('near')}>
            {t('nav.near')}
          </Link>
          <Link href="/events" aria-current={current('events')}>
            {t('nav.events')}
          </Link>
          <Link href="/for-business" aria-current={current('business')}>
            {t('footer.forBusiness')}
          </Link>
        </nav>

        <div className="nav-right">
          <Link href="/search" className="icon-btn" aria-label={t('nav.search')} aria-current={current('search')}>
            <IconSearch stroke={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/cabinet/bookings"
            className="icon-btn desk"
            aria-label={t('nav.bookings')}
          >
            <IconCalendarEvent stroke={1.75} aria-hidden="true" />
          </Link>
          <Link href="/cabinet" className="icon-btn desk" aria-label={t('nav.cabinet')} aria-current={current('cabinet')}>
            <IconUser stroke={1.75} aria-hidden="true" />
          </Link>
          {LOCALES.length > 1 && (
            <nav className="lang" aria-label={t('language.change')}>
              {LOCALES.map((l) => (
                <Link
                  key={l.code}
                  href={pathname}
                  locale={l.code}
                  scroll={false}
                  data-lang=""
                  hrefLang={l.code}
                  lang={l.code}
                  aria-current={l.code === locale ? 'true' : undefined}
                >
                  {l.code.toUpperCase()}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
