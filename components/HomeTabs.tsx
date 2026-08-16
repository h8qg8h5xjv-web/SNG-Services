'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const STORAGE_KEY = 'sng_home_tab'
type Tab = 'services' | 'places'

// Two entrances (DESIGN §2в). Both sections are server-rendered and passed in as
// slots; this only toggles which is visible and remembers the choice. SSR shows
// the default ('services') so there is no hydration mismatch; a stored 'places'
// is applied after mount.
export default function HomeTabs({
  services,
  places,
}: {
  services: React.ReactNode
  places: React.ReactNode
}) {
  const t = useTranslations('home')
  const [tab, setTab] = useState<Tab>('services')

  useEffect(() => {
    const restore = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'places' || stored === 'services') setTab(stored)
    }
    restore()
  }, [])

  function choose(next: Tab) {
    setTab(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <>
      {/* Full-width row of 44px targets — each tab is a real touch target (§6). */}
      <div
        role="tablist"
        aria-label="Home sections"
        className="flex gap-1 rounded-lg border border-slate-200 p-1"
      >
        {(['services', 'places'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => choose(key)}
            className={`min-h-11 flex-1 rounded-lg px-4 text-body font-semibold transition-colors ${
              tab === key ? 'bg-teal-700 text-white' : 'text-slate-500'
            }`}
          >
            {key === 'services' ? t('tabServices') : t('tabPlaces')}
          </button>
        ))}
      </div>

      <div className={tab === 'services' ? '' : 'hidden'}>{services}</div>
      <div className={tab === 'places' ? '' : 'hidden'}>{places}</div>
    </>
  )
}
