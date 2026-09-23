'use client'

import { useTranslations } from 'next-intl'
import { IconAlertTriangle } from '@tabler/icons-react'

// Error boundary for the provider page (§6): a friendly "couldn't load" with a
// retry that re-renders the segment.
export default function ProviderError({ reset }: { reset: () => void }) {
  const t = useTranslations('errors')
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <IconAlertTriangle className="h-10 w-10 text-slate-400" stroke={1.5} />
      <h1 className="mt-3 text-h2 font-semibold text-slate-900">{t('loadTitle')}</h1>
      <p className="mt-1 text-body text-slate-500">{t('loadBody')}</p>
      <button
        type="button"
        onClick={reset}
        className="press focus-ring mt-5 min-h-11 rounded-control bg-accent px-5 text-body font-semibold text-white hover:bg-blue-900"
      >
        {t('retry')}
      </button>
    </main>
  )
}
