// Guest requests have no account, so we remember their (ref, token) locally to
// show them under "Bookings". The token is the read key for the request's live
// status (RLS-safe, server-side). Client-only.

const KEY = 'sng_requests'

export type SavedRequest = { ref: string; token: string; at: string }

export function getSavedRequests(): SavedRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedRequest[]) : []
  } catch {
    return []
  }
}

export function saveRequest(ref: string, token: string): void {
  if (typeof window === 'undefined') return
  const list = getSavedRequests().filter((r) => r.ref !== ref)
  list.unshift({ ref, token, at: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
}
