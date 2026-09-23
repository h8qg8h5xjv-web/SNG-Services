'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconSearch, IconClock } from '@tabler/icons-react'
import type { Suggestion } from '@/lib/search/suggest'

const RECENT_KEY = 'sng_recent_searches'

function readRecent(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]).slice(0, 3)
  } catch {
    return []
  }
}
function pushRecent(q: string) {
  try {
    const list = [q, ...readRecent().filter((r) => r !== q)].slice(0, 3)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

// DESIGN-SYSTEM §2 / §11: flat field + visible "Найти". A NATIVE GET form (so
// Найти and Enter always navigate, even without JS — next-intl's router mangles
// query strings, which broke search). Suggestions and the best-category jump use
// window.location with locale-prefixed paths.
export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const t = useTranslations('home')
  const locale = useLocale()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [best, setBest] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([])
        setBest(null)
        return
      }
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&locale=${locale}`)
        const data = (await res.json()) as { suggestions: Suggestion[]; best: string | null }
        setSuggestions(data.suggestions ?? [])
        setBest(data.best ?? null)
      } catch {
        setSuggestions([])
      }
    }, 150)
    return () => window.clearTimeout(timer.current)
  }, [query, locale])

  function goto(path: string) {
    window.location.assign(`/${locale}${path}`)
  }

  function onSubmit(e: React.FormEvent) {
    const q = query.trim()
    if (!q) return // let the empty native submit go to /search
    pushRecent(q)
    // Enter without picking a suggestion → best category (§11); else native search.
    if (best) {
      e.preventDefault()
      goto(`/${best}`)
    }
  }

  const showRecent = open && query.trim().length < 2 && recent.length > 0
  const showSuggestions = open && suggestions.length > 0

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      {/* 3D search capsule (§Эффекты): raised light edge, blue submit circle. */}
      <form role="search" action={`/${locale}/search`} method="get" onSubmit={onSubmit} className="search-3d flex w-full items-center">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setRecent(readRecent())
            setOpen(true)
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="search-3d__field min-h-11 pl-4 pr-14 text-body"
        />
        <button
          type="submit"
          aria-label={t('search')}
          className="search-3d__go focus-ring h-11 w-11"
        >
          <IconSearch className="h-5 w-5" stroke={2} />
        </button>
      </form>

      {(showSuggestions || showRecent) && (
        <div className="drop-in absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-control border border-slate-200 bg-white">
          {showRecent &&
            recent.map((r) => (
              <button
                key={r}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  pushRecent(r)
                  goto(`/search?q=${encodeURIComponent(r)}`)
                }}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-body text-slate-700 hover:bg-slate-50"
              >
                <IconClock className="h-4 w-4 text-slate-400" stroke={1.5} />
                {r}
              </button>
            ))}
          {showSuggestions &&
            suggestions.map((s) => (
              <button
                key={`${s.kind}-${s.href}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  pushRecent(s.label)
                  goto(s.href)
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left hover:bg-slate-50"
              >
                <span className="truncate text-body text-slate-900">{s.label}</span>
                <span className="shrink-0 text-label text-slate-400">{s.sub ?? t(`suggestKind.${s.kind}`)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
