'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { EVENT_CATEGORIES, eventCategorySlug } from '@/lib/events/constants'

type PriceFilter = '' | 'free' | 'paid'

export default function EventFilters({
  boroughs,
  currentCategory,
  currentBorough,
  currentPrice,
}: {
  boroughs: string[]
  currentCategory: string
  currentBorough: string
  currentPrice: PriceFilter
}) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()

  function apply(next: { category?: string; borough?: string; price?: string }) {
    const category = next.category ?? currentCategory
    const borough = next.borough ?? currentBorough
    const price = next.price ?? currentPrice
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (borough) qs.set('borough', borough)
    if (price) qs.set('price', price)
    const query = qs.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">{t('events.filterCategory')}</span>
        <select
          value={currentCategory}
          onChange={(e) => apply({ category: e.target.value })}
          className="min-h-11 rounded-lg border border-black/10 bg-transparent px-3 dark:border-white/20"
        >
          <option value="">{t('events.allCategories')}</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`eventCategory.${eventCategorySlug(c)}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">{t('catalog.filtersBorough')}</span>
        <select
          value={currentBorough}
          onChange={(e) => apply({ borough: e.target.value })}
          className="min-h-11 rounded-lg border border-black/10 bg-transparent px-3 dark:border-white/20"
        >
          <option value="">{t('catalog.filtersAllBoroughs')}</option>
          {boroughs.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">{t('events.filterPrice')}</span>
        <select
          value={currentPrice}
          onChange={(e) => apply({ price: e.target.value })}
          className="min-h-11 rounded-lg border border-black/10 bg-transparent px-3 dark:border-white/20"
        >
          <option value="">{t('events.priceAll')}</option>
          <option value="free">{t('events.priceFree')}</option>
          <option value="paid">{t('events.pricePaid')}</option>
        </select>
      </label>
    </div>
  )
}
