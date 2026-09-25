'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconList, IconMap, IconMapPin } from '@tabler/icons-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Dialog } from '@/components/ui/Dialog'
import Select from '@/components/ui/Select'
import type { SortKey } from '@/lib/catalog/transform'

const SORTS: SortKey[] = ['relevance', 'price', 'newest']

export type ViewMode = 'list' | 'map'

export type CategoryFilterState = {
  boroughs: string[]
  sort: SortKey
  travels: boolean
  verifiedOnly: boolean
  view: ViewMode
}

type Facet = { borough: string; travels: boolean; verified: boolean }

// Category toolbar (DEMO_MAP §3.5): one row of pill controls (a scrolling row on
// phones). Areas keep the site's multi-choice — a dialog of chips with a live
// «Показать N». Everything lives in the URL; changes re-render the list with
// FLIP.
export default function CategoryToolbar({
  boroughs,
  facets,
  current,
}: {
  boroughs: string[]
  facets: Facet[]
  current: CategoryFilterState
}) {
  const t = useTranslations('catalog')
  const t2 = useTranslations('cat2')
  const tm = useTranslations('map')
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(current.boroughs)

  function apply(next: CategoryFilterState) {
    const qs = new URLSearchParams()
    if (next.boroughs.length) qs.set('borough', next.boroughs.join(','))
    if (next.sort !== 'relevance') qs.set('sort', next.sort)
    if (next.travels) qs.set('travels', '1')
    if (next.verifiedOnly) qs.set('verified', '1')
    if (next.view === 'map') qs.set('view', 'map')
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const countFor = (list: string[]) =>
    facets.filter(
      (f) =>
        (list.length === 0 || list.includes(f.borough)) &&
        (!current.travels || f.travels) &&
        (!current.verifiedOnly || f.verified),
    ).length

  const sortLabel: Record<SortKey, string> = {
    relevance: t('sortRelevance'),
    price: t('sortPrice'),
    newest: t('sortNewest'),
  }

  return (
    <>
      <div className="toolbar" role="group" aria-label={t2('filters')}>
        {boroughs.length > 1 && (
          <button
            type="button"
            className="tog"
            aria-pressed={current.boroughs.length > 0}
            onClick={() => {
              setDraft(current.boroughs)
              setOpen(true)
            }}
          >
            <IconMapPin stroke={1.75} aria-hidden="true" />
            {current.boroughs.length === 1
              ? current.boroughs[0]
              : current.boroughs.length > 1
                ? t2('boroughN', { n: current.boroughs.length })
                : t2('borough')}
          </button>
        )}
        <button
          type="button"
          className="tog"
          aria-pressed={current.verifiedOnly}
          onClick={() => apply({ ...current, verifiedOnly: !current.verifiedOnly })}
        >
          {t('filterVerified')}
        </button>
        <button
          type="button"
          className="tog"
          aria-pressed={current.travels}
          onClick={() => apply({ ...current, travels: !current.travels })}
        >
          {t('filterTravels')}
        </button>
        <span className="grow" />
        <Select
          value={current.sort}
          onChange={(v) => apply({ ...current, sort: v as SortKey })}
          options={SORTS.map((s) => ({ value: s, label: sortLabel[s] }))}
          ariaLabel={t('sortLabel')}
          title={t('sortLabel')}
          variant="pill"
          active={current.sort !== 'relevance'}
        />
        <button type="button" className="tog" aria-pressed={current.view === 'list'} onClick={() => apply({ ...current, view: 'list' })}>
          <IconList stroke={1.75} aria-hidden="true" /> {tm('viewList')}
        </button>
        <button type="button" className="tog" aria-pressed={current.view === 'map'} onClick={() => apply({ ...current, view: 'map' })}>
          <IconMap stroke={1.75} aria-hidden="true" /> {tm('viewMap')}
        </button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="area-h">
        <h3 id="area-h">{t2('borough')}</h3>
        <div className="dchips mt-5">
          {boroughs.map((b) => (
            <button
              key={b}
              type="button"
              className="dchip"
              aria-pressed={draft.includes(b)}
              onClick={() => setDraft((d) => (d.includes(b) ? d.filter((x) => x !== b) : [...d, b]))}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="dlg-actions">
          <button
            type="button"
            className="btn btn-ink"
            onClick={() => {
              apply({ ...current, boroughs: draft })
              setOpen(false)
            }}
          >
            {t('showN', { count: countFor(draft) })}
          </button>
          <button type="button" className="btn btn-plain" onClick={() => setDraft([])}>
            {t('reset')}
          </button>
        </div>
      </Dialog>
    </>
  )
}
