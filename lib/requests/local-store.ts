// Guests have no account, so we remember their (ref, token) pairs locally: for
// requests and, since …38, for direct bookings — one list, one sync path. The
// token is the read key (checked server-side). Entries without `kind` are
// requests (the format before bookings joined). Client-only.

const KEY = 'sng_requests'

export type SavedKind = 'request' | 'booking'
export type SavedItem = { ref: string; token: string; at: string; kind?: SavedKind }
export type SavedRequest = SavedItem

const isBooking = (i: SavedItem) => i.kind === 'booking'

// Everything this browser remembers (what sign-in links to the account).
export function getSavedItems(): SavedItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as SavedItem[]) : []
    return Array.isArray(list) ? list.filter((i) => i && typeof i.ref === 'string' && typeof i.token === 'string') : []
  } catch {
    return []
  }
}

export function getSavedRequests(): SavedItem[] {
  return getSavedItems().filter((i) => !isBooking(i))
}

export function getSavedBookings(): SavedItem[] {
  return getSavedItems().filter(isBooking)
}

function remember(ref: string, token: string, kind: SavedKind): void {
  if (typeof window === 'undefined') return
  const list = getSavedItems().filter((r) => r.ref !== ref)
  list.unshift({ ref, token, at: new Date().toISOString(), ...(kind === 'booking' ? { kind } : {}) })
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)))
  } catch {
    // storage full or blocked — the booking itself is saved server-side
  }
}

export function saveRequest(ref: string, token: string): void {
  remember(ref, token, 'request')
}

export function saveBooking(ref: string, token: string): void {
  remember(ref, token, 'booking')
}

// §3: merge items restored from the account into this device's list (by ref).
export function mergeRequests(incoming: { ref: string; token: string; at?: string; kind?: SavedKind }[]): void {
  if (typeof window === 'undefined') return
  const byRef = new Map<string, SavedItem>()
  const norm = (r: { ref: string; token: string; at?: string; kind?: SavedKind }): SavedItem => ({
    ref: r.ref,
    token: r.token,
    at: r.at ?? new Date().toISOString(),
    ...(r.kind === 'booking' ? { kind: 'booking' as const } : {}),
  })
  for (const r of [...incoming, ...getSavedItems()]) {
    if (r && typeof r.ref === 'string' && typeof r.token === 'string') byRef.set(r.ref, norm(r))
  }
  try {
    localStorage.setItem(KEY, JSON.stringify([...byRef.values()].slice(0, 100)))
  } catch {
    // ignore
  }
}

// §3 GDPR: wipe the local pointers on "delete my data".
export function clearRequests(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
