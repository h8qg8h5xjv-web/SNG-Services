'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import type { SortKey } from '@/lib/catalog/transform'

const SORTS: SortKey[] = ['relevance', 'price', 'slot']

export default function CategoryFilters({
  boroughs,
  currentBorough,
  currentSort,
}: {
  boroughs: string[]
  currentBorough: string
  currentSort: SortKey
}) {
  const t = useTranslations('catalog')
  const router = useRouter()
  const pathname = usePathname()

  function apply(nextBorough: string, nextSort: SortKey) {
    const qs = new URLSearchParams()
    if (nextBorough) qs.set('borough', nextBorough)
    if (nextSort !== 'relevance') qs.set('sort', nextSort)
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const sortLabel: Record<SortKey, string> = {
    relevance: t('sortRelevance'),
    price: t('sortPrice'),
    slot: t('sortSlot'),
  }

  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-body">
        <span className="text-slate-500">{t('filtersBorough')}</span>
        <select
          value={currentBorough}
          onChange={(e) => apply(e.target.value, currentSort)}
          className="min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
        >
          <option value="">{t('filtersAllBoroughs')}</option>
          {boroughs.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-body">
        <span className="text-slate-500">{t('sortLabel')}</span>
        <select
          value={currentSort}
          onChange={(e) => apply(currentBorough, e.target.value as SortKey)}
          className="min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {sortLabel[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
