'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'

export type GeocodeHit = { label: string; lat: number; lng: number }
export type GeocodeResult =
  | { ok: true; hits: GeocodeHit[] }
  | { ok: false; error: string }

// Nominatim usage policy: at most one request per second, and a real User-Agent
// identifying the app. We serialise calls with a module-level timestamp so admins
// clicking «Найти на карте» never exceed the limit (§4).
let lastCall = 0
const MIN_INTERVAL_MS = 1100

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const q = query.trim()
  if (q.length < 3) return { ok: true, hits: [] }

  const wait = lastCall + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await delay(wait)
  lastCall = Date.now()

  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=gb&addressdetails=0&q=' +
    encodeURIComponent(q)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SNG-Services/1.0 (services catalog for the CIS community in the UK)',
        'Accept-Language': 'ru,en',
      },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: `Geocoder returned ${res.status}.` }
    const raw = (await res.json()) as unknown
    if (!Array.isArray(raw)) return { ok: true, hits: [] }
    const hits: GeocodeHit[] = []
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue
      const r = item as Record<string, unknown>
      const lat = Number(r.lat)
      const lng = Number(r.lon)
      const label = typeof r.display_name === 'string' ? r.display_name : ''
      if (Number.isFinite(lat) && Number.isFinite(lng) && label) {
        hits.push({ label, lat, lng })
      }
    }
    return { ok: true, hits }
  } catch {
    return { ok: false, error: 'Geocoder unreachable.' }
  }
}
