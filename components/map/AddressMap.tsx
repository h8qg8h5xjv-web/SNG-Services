'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

// maplibre-gl loads only when a provider page with coordinates is opened (§5).
const StaticMiniMap = dynamic(() => import('@/components/map/StaticMiniMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
})

// A small static map for the «Адрес» block; tapping opens the full OSM map (§3).
export default function AddressMap({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations('map')
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('openLarge')}
      className="address-map focus-ring mt-3 block overflow-hidden rounded-card border border-slate-200"
    >
      <StaticMiniMap lat={lat} lng={lng} />
    </a>
  )
}
