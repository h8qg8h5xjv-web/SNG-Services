'use client'

import { useTranslations } from 'next-intl'
import { Pane } from '@/components/ui/Pane'

// Error boundary for the provider page: a friendly "couldn't load" with a retry
// that re-renders the segment.
export default function ProviderError({ reset }: { reset: () => void }) {
  const t = useTranslations('errors')
  return (
    <div className="wrap page">
      <div className="empty mt-10">
        <Pane off time="!" />
        <h1 className="h3">{t('loadTitle')}</h1>
        <p>{t('loadBody')}</p>
        <div className="acts">
          <button type="button" onClick={reset} className="btn btn-ink">
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
