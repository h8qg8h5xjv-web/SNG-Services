'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

// §9: consent line for the request / booking / for-business forms — links to the
// terms and privacy policy. Rendered via t.rich so the links sit inline in every
// locale.
export default function Consent({ className = '' }: { className?: string }) {
  const t = useTranslations('legal')
  return (
    <p className={`consent ${className}`}>
      {t.rich('consent', {
        terms: (chunks) => (
          <Link href="/terms">
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy">
            {chunks}
          </Link>
        ),
      })}
    </p>
  )
}
