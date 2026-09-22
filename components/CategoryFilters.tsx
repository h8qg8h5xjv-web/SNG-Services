'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Select } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
import type { SortKey } from '@/lib/catalog/transform'

const SORTS: SortKey[] = ['relevance', 'price', 'newest']

export type CategoryFilterState = {
  borough: string
  sort: SortKey
  travels: boolean
  verifiedOnly: boolean
}

// All state lives in the URL so a filtered view is a shareable link (idea #5).
export default function CategoryFilters({
  boroughs,
  current,
}: {
  boroughs: string[]
  current: CategoryFilterState
}) {
  const t = useTranslations('catalog')
  const router = useRouter()
  const pathname = usePathname()

  function apply(next: CategoryFilterState) {
    const qs = new URLSearchParams()
    if (next.borough) qs.set('borough', next.borough)
    if (next.sort !== 'relevance') qs.set('sort', next.sort)
    if (next.travels) qs.set('travels', '1')
    if (next.verifiedOnly) qs.set('verified', '1')
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const sortLabel: Record<SortKey, string> = {
    relevance: t('sortRelevance'),
    price: t('sortPrice'),
    newest: t('sortNewest'),
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-body">
          <span className="text-slate-500">{t('filtersBorough')}</span>
          <Select
            value={current.borough}
            onChange={(e) => apply({ ...current, borough: e.target.value })}
          >
            <option value="">{t('filtersAllBoroughs')}</option>
            {boroughs.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-body">
          <span className="text-slate-500">{t('sortLabel')}</span>
          <Select
            value={current.sort}
            onChange={(e) => apply({ ...current, sort: e.target.value as SortKey })}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {sortLabel[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={current.travels}
          onClick={() => apply({ ...current, travels: !current.travels })}
        >
          {t('filterTravels')}
        </FilterChip>
        <FilterChip
          active={current.verifiedOnly}
          onClick={() => apply({ ...current, verifiedOnly: !current.verifiedOnly })}
        >
          {t('filterVerified')}
        </FilterChip>
      </div>
    </div>
  )
}
