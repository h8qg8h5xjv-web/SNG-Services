'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconSearch, IconClock } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'
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

// DESIGN-SYSTEM §2 / §11: flat field + visible "Найти"; typo/layout-tolerant
// suggestions as you type; last three queries under the empty field.
export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const t = useTranslations('home')
  const locale = useLocale()
  const router = useRouter()
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

  function go(href: string, remember: string) {
    pushRecent(remember)
    setOpen(false)
    router.push(href)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push('/search')
      return
    }
    // Enter without picking a suggestion → best category, else full search (§11).
    go(best ? `/${best}` : `/search?q=${encodeURIComponent(q)}`, q)
  }

  const showRecent = open && query.trim().length < 2 && recent.length > 0
  const showSuggestions = open && suggestions.length > 0

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form role="search" onSubmit={onSubmit} className="flex w-full gap-2">
        <div className="relative flex-1">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            stroke={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setRecent(readRecent())
              setOpen(true)
            }}
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

      {(showSuggestions || showRecent) && (
        <div className="drop-in absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-control border border-slate-200 bg-white">
          {showRecent &&
            recent.map((r) => (
              <button
                key={r}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(r)
                  go(`/search?q=${encodeURIComponent(r)}`, r)
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
                onClick={() => go(s.href, s.label)}
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
