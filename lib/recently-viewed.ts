// Recently-viewed providers, stored client-side in localStorage. No auth,
// no server storage — just a browser convenience (DESIGN §3).
// Exposed as an external store so components can read it via useSyncExternalStore
// (no setState-in-effect, no hydration mismatch).

export type RecentItem = {
  slug: string
  categorySlug: string
  name: string
  borough: string
  coverImage: string | null
}

const KEY = 'sng.recentlyViewed'
const UPDATED_EVENT = 'sng:recently-viewed'
const MAX = 10

// Stable empty reference for SSR / errors (useSyncExternalStore needs referential stability).
const EMPTY: RecentItem[] = []

// Cache so getSnapshot returns the same array reference until the raw value changes.
let cache: { raw: string | null; value: RecentItem[] } = { raw: null, value: EMPTY }

export function readRecent(): RecentItem[] {
  if (typeof window === 'undefined') return EMPTY
  const raw = window.localStorage.getItem(KEY)
  if (raw === cache.raw) return cache.value
  let value: RecentItem[] = EMPTY
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (Array.isArray(parsed)) value = parsed as RecentItem[]
  } catch {
    value = EMPTY
  }
  cache = { raw, value }
  return value
}

export function pushRecent(item: RecentItem): void {
  if (typeof window === 'undefined') return
  try {
    const existing = readRecent().filter((i) => i.slug !== item.slug)
    const next = [item, ...existing].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(UPDATED_EVENT))
  } catch {
    // Ignore quota/serialization errors — this is a nice-to-have.
  }
}

export function subscribeRecent(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(UPDATED_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(UPDATED_EVENT, callback)
  }
}

export function getServerRecent(): RecentItem[] {
  return EMPTY
}
