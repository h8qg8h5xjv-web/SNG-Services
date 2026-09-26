'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import BusinessRow from '@/components/catalog/BusinessRow'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import { toMapPoints } from '@/lib/maps/points'

// The map (and maplibre-gl) loads only when «Карта» is selected (§5).
const ProvidersMap = dynamic(() => import('@/components/map/ProvidersMap'), {
  ssr: false,
  loading: () => <div className="skel h-full w-full" />,
})

// The category «Карта» view: the same providers as the list, on one map with the
// current filters already applied (the parent passes the filtered cards).
export default function CategoryMapView({ cards }: { cards: ProviderCardVM[] }) {
  const t = useTranslations('map')
  const router = useRouter()
  const points = useMemo(() => toMapPoints(cards), [cards])
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedCard = selectedId ? cardById.get(selectedId) ?? null : null

  return (
    <div className="map-lg">
      <ProvidersMap
        points={points}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onOpen={(p) => router.push(p.href)}
        showLocate
        locateLabel={t('locate')}
      />
      {selectedCard && (
        <ul className="results near-selected">
          <BusinessRow card={selectedCard} surface="category" />
        </ul>
      )}
    </div>
  )
}
