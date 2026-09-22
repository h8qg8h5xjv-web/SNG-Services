import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from './LanguageSwitcher'
import SearchBar from './SearchBar'

// DESIGN-SYSTEM §2: dark ink bar. Mobile 52px — wordmark + language. Desktop 56px
// — wordmark, centered search, catalog/afisha/cabinet links, language.
export default function Header() {
  const t = useTranslations()

  return (
    <header className="sticky top-0 z-20 bg-ink text-white">
      <div className="mx-auto flex h-13 max-w-page items-center justify-between gap-4 px-3.5 sm:h-14 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-h2 font-extrabold tracking-tight text-white">SNG</span>
          <span className="hidden text-meta text-blue-200 sm:inline">{t('common.city')}</span>
        </Link>

        <div className="hidden flex-1 justify-center sm:flex">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-5 text-body sm:flex">
          <Link href="/" className="text-blue-100 transition-colors hover:text-white">
            {t('nav.catalog')}
          </Link>
          <Link href="/events" className="text-blue-100 transition-colors hover:text-white">
            {t('nav.events')}
          </Link>
          <Link href="/cabinet" className="text-blue-100 transition-colors hover:text-white">
            {t('nav.cabinet')}
          </Link>
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  )
}
