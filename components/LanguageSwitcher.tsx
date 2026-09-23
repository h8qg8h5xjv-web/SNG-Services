'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { localeConfigs } from '@/i18n/locales'
import Select from '@/components/ui/Select'

// Only enabled locales are offered. Switching keeps the current path and changes
// the locale prefix; next-intl stores the choice in the NEXT_LOCALE cookie.
const options = localeConfigs.filter((l) => l.enabled).map((l) => ({ value: l.code, label: l.name }))

export default function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  function onChange(next: string) {
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <Select
      value={locale}
      onChange={onChange}
      options={options}
      ariaLabel={t('change')}
      title={t('change')}
      className="w-36"
    />
  )
}
