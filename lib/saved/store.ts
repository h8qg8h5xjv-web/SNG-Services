// Saved providers — no account, just a list of provider slugs in localStorage.
// Backed by useSyncExternalStore so every heart and the /saved page stay in sync,
// including across tabs. Reads happen only on the client and are wrapped in
// try/catch, so private-mode Safari (where localStorage throws) degrades to an
// empty list instead of crashing. The server snapshot is always empty, so first
// render matches SSR — no hydration mismatch; hearts fill in right after mount.

const KEY = 'sng_saved'
const EMPTY: readonly string[] = []

let cache: string[] | null = null
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function emit() {
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = read()
      emit()
    }
  })
}

export function subscribeSaved(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// Stable reference until a change, as useSyncExternalStore requires.
export function getSavedSnapshot(): readonly string[] {
  if (cache === null) cache = read()
  return cache
}

export function getSavedServerSnapshot(): readonly string[] {
  return EMPTY
}

export function toggleSaved(slug: string): void {
  const current = getSavedSnapshot()
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : [slug, ...current]
  cache = next.slice(0, 200)
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // private mode / storage disabled — keep the in-memory list for this session
  }
  emit()
}
