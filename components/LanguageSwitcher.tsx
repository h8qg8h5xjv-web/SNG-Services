'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { localeConfigs } from '@/i18n/locales'

// Only enabled locales are offered. Switching keeps the current path and lets
// next-intl store the choice in the NEXT_LOCALE cookie (overrides Accept-Language).
const options = localeConfigs.filter((l) => l.enabled)

export default function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t('change')}</span>
      <select
        aria-label={t('change')}
        value={locale}
        onChange={onChange}
        disabled={isPending}
        className="min-h-11 rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/20"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}
