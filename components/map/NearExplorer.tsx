'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import ProviderCard from '@/components/ProviderCard'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import { toMapPoints, type MapPoint } from '@/lib/maps/points'

// The map (and maplibre-gl) ships in its own chunk and loads only here (§5).
const ProvidersMap = dynamic(() => import('@/components/map/ProvidersMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
})

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isDesktop
}

export default function NearExplorer({ cards }: { cards: ProviderCardVM[] }) {
  const t = useTranslations('map')
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const points = useMemo(() => toMapPoints(cards), [cards])
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const dragStartY = useRef<number | null>(null)

  const visibleCards = useMemo(() => {
    const ids = visibleIds ?? points.map((p) => p.id)
    return ids.map((id) => cardById.get(id)).filter((c): c is ProviderCardVM => Boolean(c))
  }, [visibleIds, points, cardById])

  const selectedCard = selectedId ? cardById.get(selectedId) ?? null : null

  function openPoint(point: MapPoint) {
    router.push(point.href)
  }

  const mapNode = (
    <ProvidersMap
      points={points}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onOpen={openPoint}
      onBoundsChange={setVisibleIds}
      showLocate
      locateLabel={t('locate')}
    />
  )

  const list =
    visibleCards.length === 0 ? (
      <p className="px-3.5 py-6 text-body text-slate-500">{t('moveToSee')}</p>
    ) : (
      <div className="space-y-2 p-3.5">
        {visibleCards.map((c) => (
          <ProviderCard key={c.id} card={c} surface="near" />
        ))}
      </div>
    )

  const selectedOverlay = selectedCard && (
    <div className="near-selected">
      <ProviderCard card={selectedCard} surface="near" />
    </div>
  )

  if (isDesktop) {
    return (
      <div className="near-stage-desktop flex">
        <aside className="w-2/5 overflow-y-auto border-r border-slate-200">
          <p className="px-3.5 pt-4 text-meta font-semibold text-slate-500">
            {t('count', { count: visibleCards.length })}
          </p>
          {list}
        </aside>
        <div className="relative w-3/5">
          {mapNode}
          {selectedOverlay}
        </div>
      </div>
    )
  }

  return (
    <div className="near-stage-mobile">
      <div className="absolute inset-0">{mapNode}</div>
      {selectedOverlay}
      <div className={`near-sheet ${sheetOpen ? 'near-sheet--open' : 'near-sheet--peek'}`}>
        <button
          type="button"
          onPointerDown={(e) => (dragStartY.current = e.clientY)}
          onPointerUp={(e) => {
            const start = dragStartY.current
            dragStartY.current = null
            if (start == null) return
            const dy = e.clientY - start
            if (dy < -30) setSheetOpen(true)
            else if (dy > 30) setSheetOpen(false)
            else setSheetOpen((o) => !o)
          }}
          className="flex w-full shrink-0 flex-col items-center gap-1 px-3.5 py-2"
          aria-label={sheetOpen ? t('showMap') : t('showList')}
        >
          <span className="h-1 w-10 rounded-full bg-slate-300" />
          <span className="text-meta font-semibold text-slate-700">
            {t('count', { count: visibleCards.length })}
          </span>
        </button>
        <div className="flex-1 overflow-y-auto pb-4">{list}</div>
      </div>
    </div>
  )
}
