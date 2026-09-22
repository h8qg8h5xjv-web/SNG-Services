'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconSearch } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'

// DESIGN-SYSTEM §2 / §12: flat search field (10px) with a leading magnifier and a
// VISIBLE "Найти" button — not Enter-only. `.field` gives the accent focus ring.
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
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex w-full max-w-xl gap-2">
      <div className="relative flex-1">
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          stroke={2}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="field min-h-11 w-full rounded-control border border-slate-200 bg-white pl-10 pr-3 text-body text-slate-900"
        />
      </div>
      <button
        type="submit"
        className="press focus-ring min-h-11 shrink-0 rounded-control bg-accent px-4 text-body font-semibold text-white hover:bg-blue-900"
      >
        {t('search')}
      </button>
    </form>
  )
}
