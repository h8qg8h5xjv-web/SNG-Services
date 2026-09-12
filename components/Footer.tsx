import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

// Site footer on every public page: the business entry point, terms, copyright.
// Kept minimal and palette-only (DESIGN-SYSTEM); no new primitives.
export default function Footer() {
  const t = useTranslations()
  const year = new Date().getUTCFullYear()

  return (
    <footer className="mt-auto border-t border-slate-200">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-body">
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/for-business" className="text-slate-500 hover:text-slate-900">
            {t('footer.forBusiness')}
          </Link>
          <Link href="/terms" className="text-slate-500 hover:text-slate-900">
            {t('footer.terms')}
          </Link>
        </nav>
        <span className="text-meta text-slate-400">
          © {year} {t('common.appName')}
        </span>
      </div>
    </footer>
  )
}
