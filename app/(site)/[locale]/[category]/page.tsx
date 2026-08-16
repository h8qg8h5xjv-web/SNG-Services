import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMoodSad } from '@tabler/icons-react'
import Header from '@/components/Header'
import CategoryFilters from '@/components/CategoryFilters'
import ProviderGrid from '@/components/ProviderGrid'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCategoryBySlug } from '@/lib/queries/categories'
import { listProvidersByCategory } from '@/lib/queries/providers'
import { pickCategoryName } from '@/lib/i18n/content'
import { rankProviders } from '@/lib/ranking'
import {
  toCard,
  filterByBorough,
  boroughsOf,
  isServiceEligible,
  type SortKey,
} from '@/lib/catalog/transform'

const SORT_KEYS: SortKey[] = ['relevance', 'price', 'slot']

function parseSort(value: string | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : 'relevance'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>
}): Promise<Metadata> {
  const { locale, category } = await params
  const cat = await getCategoryBySlug(category)
  if (!cat) return {}
  return { title: pickCategoryName(cat, locale) }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>
  searchParams: Promise<{ borough?: string; sort?: string }>
}) {
  const { locale, category } = await params
  setRequestLocale(locale)
  const sp = await searchParams

  const cat = await getCategoryBySlug(category)
  if (!cat) notFound()

  // The category page is the Services lens — exclude listing-only places
  // (they appear under the Places tab, browsed by borough).
  const all = (await listProvidersByCategory(cat.id)).filter(isServiceEligible)
  const boroughs = boroughsOf(all)
  const borough = sp.borough && boroughs.includes(sp.borough) ? sp.borough : ''
  const sort = parseSort(sp.sort)

  const filtered = rankProviders(filterByBorough(all, borough || null), {
    locale,
    sort,
    categorySlug: category,
  })
  const cards = filtered.map((p) => toCard(p, category, locale))

  const t = await getTranslations('catalog')

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8">
        <div className="py-6">
          <h1 className="text-title font-semibold">{pickCategoryName(cat, locale)}</h1>
          <p className="mt-1 text-body text-slate-500">
            {t('providersCount', { count: all.length })}
          </p>
        </div>

        {all.length > 0 && (
          <div className="mb-6">
            <CategoryFilters
              boroughs={boroughs}
              currentBorough={borough}
              currentSort={sort}
            />
          </div>
        )}

        {all.length === 0 ? (
          <EmptyState icon={IconMoodSad} text={t('emptyCategory')} />
        ) : cards.length === 0 ? (
          <EmptyState icon={IconMoodSad} text={t('emptyFiltered')} />
        ) : (
          <>
            <ProviderGrid cards={cards} surface="category" />
            <TrackImpressions
              surface="category"
              locale={locale}
              items={cards.map((c, i) => ({
                providerId: c.id,
                position: i + 1,
                categoryId: cat.id,
              }))}
            />
          </>
        )}
      </main>
    </>
  )
}
