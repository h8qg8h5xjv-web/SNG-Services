'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconSearch, IconClock, IconX } from '@tabler/icons-react'
import { searchNavPath } from '@/lib/search/target'
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

// v2 search box (DEMO_MAP §3.6 `.sbox`) + visible "Найти". A NATIVE GET form (so
// Найти and Enter always navigate, even without JS — next-intl's router mangles
// query strings, which broke search). Suggestions and the best-category jump use
// window.location with locale-prefixed paths.
export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const t = useTranslations('home')
  const tc = useTranslations('cat2')
  const locale = useLocale()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
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
        return
      }
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&locale=${locale}`)
        const data = (await res.json()) as { suggestions: Suggestion[] }
        setSuggestions(data.suggestions ?? [])
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
    // Always navigate from React state so the typed text is never lost. The native
    // action=/{locale}/search + name="q" stays only as a no-JS fallback.
    const path = searchNavPath(query)
    if (!path) return
    e.preventDefault()
    pushRecent(query.trim())
    goto(path)
  }

  const showRecent = open && query.trim().length < 2 && recent.length > 0
  const showSuggestions = open && suggestions.length > 0

  return (
    <div ref={boxRef} className="sbox-wrap">
      <form role="search" action={`/${locale}/search`} method="get" onSubmit={onSubmit} className="sbox">
        <IconSearch stroke={1.75} aria-hidden="true" />
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
          enterKeyHint="search"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="clear" aria-label={tc('clear')} onClick={() => setQuery('')}>
            <IconX stroke={2} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="btn btn-amber btn-sm">
          {t('search')}
        </button>
      </form>

      {(showSuggestions || showRecent) && (
        <div className="sel-panel sbox-drop">
          <div className="sel-list">
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
                  className="sel-opt w-full"
                >
                  <span className="inline-flex items-center gap-2">
                    <IconClock stroke={1.75} aria-hidden="true" />
                    {r}
                  </span>
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
                  className="sel-opt w-full text-left"
                >
                  <span className="truncate">{s.label}</span>
                  <small>{s.sub ?? t(`suggestKind.${s.kind}`)}</small>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
