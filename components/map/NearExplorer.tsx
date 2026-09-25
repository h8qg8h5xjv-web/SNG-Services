'use client'

import { useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import BusinessRow from '@/components/catalog/BusinessRow'
import FlipList from '@/components/catalog/FlipList'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import type { FreeWindow } from '@/lib/slots/windows'
import { toMapPoints, type MapPoint } from '@/lib/maps/points'

// The map (and maplibre-gl) ships in its own chunk and loads only here.
const ProvidersMap = dynamic(() => import('@/components/map/ProvidersMap'), {
  ssr: false,
  loading: () => <div className="skel h-full w-full" />,
})

// «Рядом» (DEMO_MAP §3.7, on the real OSM map): the map sticks on the left and
// the list of what's inside the map's bounds on the right; on phones the map
// sits on top and the list is a sheet over it (the grabber scrolls it up).
export default function NearExplorer({
  cards,
  responseMins,
  windowsBySlug,
}: {
  cards: ProviderCardVM[]
  responseMins?: Record<string, number>
  windowsBySlug?: Record<string, FreeWindow[]>
}) {
  const t = useTranslations()
  const router = useRouter()
  const points = useMemo(() => toMapPoints(cards), [cards])
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listRef = useRef<HTMLElement | null>(null)

  const visibleCards = useMemo(() => {
    const ids = visibleIds ?? points.map((p) => p.id)
    return ids.map((id) => cardById.get(id)).filter((c): c is ProviderCardVM => Boolean(c))
  }, [visibleIds, points, cardById])
  const selectedCard = selectedId ? (cardById.get(selectedId) ?? null) : null

  const toggleSheet = () => {
    const el = listRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const atMap = el.getBoundingClientRect().top > window.innerHeight * 0.4
    if (atMap) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="near-page">
      <div className="near-map">
        <div className="map-box">
          <ProvidersMap
            points={points}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={(p: MapPoint) => router.push(p.href)}
            onBoundsChange={setVisibleIds}
            showLocate
            locateLabel={t('map.locate')}
          />
          {selectedCard && (
            <ul className="results near-selected">
              <BusinessRow
                card={selectedCard}
                surface="near"
                responseMin={responseMins?.[selectedCard.id] ?? null}
                windows={windowsBySlug?.[selectedCard.slug]}
              />
            </ul>
          )}
        </div>
      </div>
      <section className="near-list" aria-labelledby="near-h" ref={listRef}>
        <button type="button" className="grabber" aria-label={`${t('map.showList')} / ${t('map.showMap')}`} onClick={toggleSheet} />
        <h1 id="near-h" className="ph1">
          {t('nav.near')}
        </h1>
        <p className="muted mt-2" aria-live="polite">
          {t('map.count', { count: visibleCards.length })}
        </p>
        {visibleCards.length === 0 ? (
          <p className="muted mt-6">{t('map.moveToSee')}</p>
        ) : (
          <FlipList className="results">
            {visibleCards.map((c) => (
              <BusinessRow
                key={c.slug}
                card={c}
                surface="near"
                responseMin={responseMins?.[c.id] ?? null}
                windows={windowsBySlug?.[c.slug]}
              />
            ))}
          </FlipList>
        )}
      </section>
    </div>
  )
}
