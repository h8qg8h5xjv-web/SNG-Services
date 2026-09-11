'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { IconChevronLeft } from '@tabler/icons-react'

// Explicit mobile back control (DESIGN §3/§6): in the app there's no browser
// chrome, so every internal screen needs its own way back. Hidden on desktop,
// where the header nav covers navigation.
export default function BackButton() {
  const router = useRouter()
  const t = useTranslations('common')

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-2 inline-flex min-h-11 items-center gap-1 text-body font-semibold text-slate-500 sm:hidden"
      aria-label={t('back')}
    >
      <IconChevronLeft className="h-6 w-6" stroke={1.5} />
      {t('back')}
    </button>
  )
}
