import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { BRAND_NAME } from '@/lib/brand'

// Night footer (DEMO_MAP §3.0): business entry point, legal links, copyright.
export default function Footer() {
  const t = useTranslations()
  const year = new Date().getUTCFullYear()

  return (
    <footer className="foot">
      <div className="wrap">
        <span>
          © {year} {BRAND_NAME}
        </span>
        <nav aria-label={t('nav.info')}>
          <Link href="/for-business">{t('footer.forBusiness')}</Link>
          <Link href="/terms">{t('footer.terms')}</Link>
          <Link href="/privacy">{t('footer.privacy')}</Link>
        </nav>
      </div>
    </footer>
  )
}
