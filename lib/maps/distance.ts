// Haversine distance between two lat/lng points, in metres. Used to sort the
// "Рядом" list by proximity when the visitor's location is known. No external deps.

const EARTH_RADIUS_M = 6_371_000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Central London (Charing Cross) — the fallback centre when the visitor has not
// shared a location. Keeps the initial /near view over the target audience's city.
export const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 } as const
