'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconSearch } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'

export default function SearchBar({
  initialQuery = '',
}: {
  initialQuery?: string
}) {
  const t = useTranslations('home')
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push('/search')
      return
    }
    // Results are grouped by section; the active home tab decides which group
    // shows first (DESIGN §4).
    const section = typeof window !== 'undefined' ? localStorage.getItem('sng_home_tab') : null
    const suffix = section === 'places' ? '&section=places' : ''
    router.push(`/search?q=${encodeURIComponent(q)}${suffix}`)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="w-full max-w-xl">
      {/* Pill search field with a leading magnifier (DESIGN-SYSTEM §2). Submits on
          Enter; the icon doubles as the visible affordance. */}
      <div className="relative">
        <IconSearch
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          stroke={2}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="min-h-12 w-full rounded-full border-medium border-slate-900 bg-white pl-11 pr-4 text-body"
        />
        <button type="submit" className="sr-only">
          {t('search')}
        </button>
      </div>
    </form>
  )
}
