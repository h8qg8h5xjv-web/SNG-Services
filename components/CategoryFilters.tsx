'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconAdjustmentsHorizontal, IconX, IconChevronDown, IconList, IconMap } from '@tabler/icons-react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
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

// Category filters (§4). Mobile: a chips row (Фильтры first, then active filters +
// sort) and a bottom sheet with checkboxes and a "Показать N" button. Desktop: a
// left sidebar. Everything lives in the URL.
export default function CategoryFilters({
  boroughs,
  facets,
  current,
}: {
  boroughs: string[]
  facets: Facet[]
  current: CategoryFilterState
}) {
  const t = useTranslations('catalog')
  const tm = useTranslations('map')
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CategoryFilterState>(current)

  function apply(next: CategoryFilterState) {
    const qs = new URLSearchParams()
    if (next.boroughs.length) qs.set('borough', next.boroughs.join(','))
    if (next.sort !== 'relevance') qs.set('sort', next.sort)
    if (next.travels) qs.set('travels', '1')
    if (next.verifiedOnly) qs.set('verified', '1')
    if (next.view === 'map') qs.set('view', 'map')
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  function count(s: CategoryFilterState): number {
    return facets.filter(
      (f) =>
        (s.boroughs.length === 0 || s.boroughs.includes(f.borough)) &&
        (!s.travels || f.travels) &&
        (!s.verifiedOnly || f.verified),
    ).length
  }

  const sortLabel: Record<SortKey, string> = {
    relevance: t('sortRelevance'),
    price: t('sortPrice'),
    newest: t('sortNewest'),
  }
  const activeCount = current.boroughs.length + (current.travels ? 1 : 0) + (current.verifiedOnly ? 1 : 0)

  function openSheet() {
    setDraft(current)
    setOpen(true)
  }
  function toggleBorough(b: string) {
    setDraft((d) => ({
      ...d,
      boroughs: d.boroughs.includes(b) ? d.boroughs.filter((x) => x !== b) : [...d.boroughs, b],
    }))
  }

  const chip =
    'chip-press focus-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 text-meta font-semibold transition-colors'
  const chipOn = 'bg-slate-900 text-white'
  const chipOff = 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'

  // «Список / Карта» toggle (Maps §2): reused in the mobile chips row and the
  // desktop sidebar. Keeps every other filter in place.
  const seg =
    'chip-press focus-ring inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-meta font-semibold transition-colors'
  const viewToggle = (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-300 bg-white p-0.5">
      <button
        type="button"
        onClick={() => apply({ ...current, view: 'list' })}
        aria-pressed={current.view === 'list'}
        className={`${seg} ${current.view === 'list' ? chipOn : 'text-slate-700'}`}
      >
        <IconList className="h-4 w-4" stroke={2} /> {tm('viewList')}
      </button>
      <button
        type="button"
        onClick={() => apply({ ...current, view: 'map' })}
        aria-pressed={current.view === 'map'}
        className={`${seg} ${current.view === 'map' ? chipOn : 'text-slate-700'}`}
      >
        <IconMap className="h-4 w-4" stroke={2} /> {tm('viewMap')}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile: chips row (§4). Список/Карта first, then Фильтры, active filters, sort. */}
      <div className="-mx-3.5 flex items-center gap-2 overflow-x-auto px-3.5 pb-1 sm:hidden">
        {viewToggle}
        <button type="button" onClick={openSheet} className={`${chip} ${activeCount ? chipOn : chipOff}`}>
          <IconAdjustmentsHorizontal className="h-5 w-5" stroke={2} />
          {t('filters')}
          {activeCount > 0 && <span className="rounded-full bg-white px-1.5 text-slate-900">{activeCount}</span>}
        </button>
        {current.boroughs.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => apply({ ...current, boroughs: current.boroughs.filter((x) => x !== b) })}
            className={`${chip} ${chipOn}`}
          >
            {b} <IconX className="h-4 w-4" stroke={2} />
          </button>
        ))}
        {current.travels && (
          <button type="button" onClick={() => apply({ ...current, travels: false })} className={`${chip} ${chipOn}`}>
            {t('filterTravels')} <IconX className="h-4 w-4" stroke={2} />
          </button>
        )}
        {current.verifiedOnly && (
          <button type="button" onClick={() => apply({ ...current, verifiedOnly: false })} className={`${chip} ${chipOn}`}>
            {t('filterVerified')} <IconX className="h-4 w-4" stroke={2} />
          </button>
        )}
        <button type="button" onClick={openSheet} className={`${chip} ${chipOff}`}>
          {sortLabel[current.sort]} <IconChevronDown className="h-4 w-4" stroke={2} />
        </button>
      </div>

      {/* Desktop: left sidebar (§4), 200px, applies immediately. */}
      <aside className="hidden w-52 shrink-0 sm:block">
        <div className="mb-4">{viewToggle}</div>
        <div className="rounded-card border border-slate-200 bg-white p-4">
          <Group title={t('filtersBorough')}>
            {boroughs.map((b) => (
              <Check
                key={b}
                label={b}
                checked={current.boroughs.includes(b)}
                onChange={() =>
                  apply({
                    ...current,
                    boroughs: current.boroughs.includes(b)
                      ? current.boroughs.filter((x) => x !== b)
                      : [...current.boroughs, b],
                  })
                }
              />
            ))}
          </Group>
          <Group title={t('filtersTrust')}>
            <Check label={t('filterVerified')} checked={current.verifiedOnly} onChange={() => apply({ ...current, verifiedOnly: !current.verifiedOnly })} />
          </Group>
          <Group title={t('filtersFormat')}>
            <Check label={t('filterTravels')} checked={current.travels} onChange={() => apply({ ...current, travels: !current.travels })} />
          </Group>
          <Group title={t('sortLabel')}>
            {SORTS.map((s) => (
              <Check kind="radio" key={s} label={sortLabel[s]} checked={current.sort === s} onChange={() => apply({ ...current, sort: s })} />
            ))}
          </Group>
        </div>
      </aside>

      {/* Mobile bottom sheet (§4). */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="mb-3 text-h2 font-semibold">{t('filters')}</h2>
        <div className="max-h-80 space-y-4 overflow-y-auto">
          <Group title={t('filtersBorough')}>
            {boroughs.map((b) => (
              <Check key={b} label={b} checked={draft.boroughs.includes(b)} onChange={() => toggleBorough(b)} />
            ))}
          </Group>
          <Group title={t('filtersTrust')}>
            <Check label={t('filterVerified')} checked={draft.verifiedOnly} onChange={() => setDraft((d) => ({ ...d, verifiedOnly: !d.verifiedOnly }))} />
          </Group>
          <Group title={t('filtersFormat')}>
            <Check label={t('filterTravels')} checked={draft.travels} onChange={() => setDraft((d) => ({ ...d, travels: !d.travels }))} />
          </Group>
          <Group title={t('sortLabel')}>
            {SORTS.map((s) => (
              <Check kind="radio" key={s} label={sortLabel[s]} checked={draft.sort === s} onChange={() => setDraft((d) => ({ ...d, sort: s }))} />
            ))}
          </Group>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={() => {
              apply(draft)
              setOpen(false)
            }}
            className="flex-1"
          >
            {t('showN', { count: count(draft) })}
          </Button>
          <button
            type="button"
            onClick={() => setDraft({ boroughs: [], sort: 'relevance', travels: false, verifiedOnly: false, view: current.view })}
            className="focus-ring min-h-11 px-2 text-body text-slate-500 hover:text-slate-900"
          >
            {t('reset')}
          </button>
        </div>
      </Modal>
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="mb-2 text-label font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
  kind = 'checkbox',
}: {
  label: string
  checked: boolean
  onChange: () => void
  kind?: 'checkbox' | 'radio'
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-body">
      <input
        type={kind}
        checked={checked}
        onChange={onChange}
        className={kind === 'checkbox' ? 'check-3d' : 'h-4 w-4 accent-blue-800'}
      />
      {label}
    </label>
  )
}
