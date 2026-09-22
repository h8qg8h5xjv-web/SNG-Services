'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { IconChevronLeft } from '@tabler/icons-react'

// Explicit back control (DESIGN §3/§6): in the app there's no browser chrome, so
// every internal screen needs its own way back. Default is a mobile-only text
// button; `floating` is a round white button that overlays a photo on all sizes.
export default function BackButton({ floating = false }: { floating?: boolean }) {
  const router = useRouter()
  const t = useTranslations('common')

  if (floating) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900"
        aria-label={t('back')}
      >
        <IconChevronLeft className="h-6 w-6" stroke={2} />
      </button>
    )
  }

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
