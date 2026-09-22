import type { ProviderCardVM } from '@/lib/catalog/transform'
import { isPlaceCard } from '@/lib/catalog/transform'

// A provider reduced to what a map marker and its popup need. Providers without
// coordinates never become points (§4: no lat/lng → not on the map).
export type MapPoint = {
  id: string
  name: string
  slug: string
  categorySlug: string
  categoryName: string
  categoryIcon: string | null
  borough: string
  // 'master' → price circle marker; 'place' → category-icon marker.
  kind: 'master' | 'place'
  pricePence: number | null
  lat: number
  lng: number
  href: string
}

export function toMapPoint(card: ProviderCardVM): MapPoint | null {
  if (card.lat == null || card.lng == null) return null
  return {
    id: card.id,
    name: card.name,
    slug: card.slug,
    categorySlug: card.categorySlug,
    categoryName: card.categoryName,
    categoryIcon: card.categoryIcon,
    borough: card.borough,
    kind: isPlaceCard(card) ? 'place' : 'master',
    pricePence: card.priceRange?.min ?? null,
    lat: card.lat,
    lng: card.lng,
    href: `/${card.categorySlug}/${card.slug}`,
  }
}

export function toMapPoints(cards: ProviderCardVM[]): MapPoint[] {
  return cards.map(toMapPoint).filter((p): p is MapPoint => p !== null)
}
