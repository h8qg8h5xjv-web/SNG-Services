import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import LanguageSwitcher from './LanguageSwitcher'

// Home header per DESIGN §3: city (London for now, but the slot stays) + the
// interface-language switcher. Service language is a separate concept and never
// appears here.
export default function Header() {
  const t = useTranslations()

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{t('common.appName')}</span>
          <span className="text-sm text-foreground/60">{t('common.city')}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
