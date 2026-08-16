'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconSearch } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

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
    <form role="search" onSubmit={onSubmit} className="flex w-full max-w-xl gap-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="flex-1"
      />
      <Button type="submit">
        <IconSearch className="h-5 w-5" stroke={2} />
        <span className="sr-only sm:not-sr-only">{t('search')}</span>
      </Button>
    </form>
  )
}
