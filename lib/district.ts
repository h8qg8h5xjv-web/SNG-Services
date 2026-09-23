import { useEffect, useState } from 'react'
import { distanceMeters } from '@/lib/maps/distance'

// The visitor's chosen area, remembered once (§3). Either shared coordinates
// ("рядом со мной") or a picked borough. Lives in localStorage, per device.
export type District =
  | { kind: 'geo'; lat: number; lng: number }
  | { kind: 'borough'; name: string }

const KEY = 'sng_district'
const EVENT = 'sng:district'

export function getDistrict(): District | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as District
    if (d.kind === 'geo' && Number.isFinite(d.lat) && Number.isFinite(d.lng)) return d
    if (d.kind === 'borough' && typeof d.name === 'string' && d.name) return d
    return null
  } catch {
    return null
  }
}

export function setDistrict(d: District | null): void {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d))
    else localStorage.removeItem(KEY)
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    // private mode — the choice simply isn't remembered
  }
}

// Reactive read: updates when the district changes anywhere (custom event) or in
// another tab (storage event).
export function useDistrict(): District | null {
  const [d, setD] = useState<District | null>(null)
  useEffect(() => {
    const read = () => setD(getDistrict())
    read()
    window.addEventListener(EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])
  return d
}

type Located = { borough: string; lat: number | null; lng: number | null }

// Reorder a list by the chosen area: by real distance when coordinates are shared,
// otherwise the chosen borough first. Stable for equal keys; never mutates input.
export function sortByDistrict<T extends Located>(items: T[], d: District | null): T[] {
  if (!d) return items
  const withIndex = items.map((item, index) => ({ item, index }))
  if (d.kind === 'geo') {
    const dist = (i: Located) =>
      i.lat != null && i.lng != null ? distanceMeters(d.lat, d.lng, i.lat, i.lng) : Infinity
    withIndex.sort((a, b) => dist(a.item) - dist(b.item) || a.index - b.index)
  } else {
    const score = (i: Located) => (i.borough === d.name ? 0 : 1)
    withIndex.sort((a, b) => score(a.item) - score(b.item) || a.index - b.index)
  }
  return withIndex.map((w) => w.item)
}
