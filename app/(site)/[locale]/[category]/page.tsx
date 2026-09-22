import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMoodSad, IconBriefcase } from '@tabler/icons-react'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { ButtonLink } from '@/components/ui/Button'
import { InfoBlock } from '@/components/ui/InfoBlock'
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
  filterByFacets,
  boroughsOf,
  isServiceEligible,
  type SortKey,
} from '@/lib/catalog/transform'

const SORT_KEYS: SortKey[] = ['relevance', 'price', 'newest']

// Below this, the category is too thin to be worth indexing (idea #7).
const MIN_INDEXABLE = 3

function parseSort(value: string | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : 'relevance'
}

type SearchParams = { borough?: string; sort?: string; travels?: string; verified?: string }

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { locale, category } = await params
  const cat = await getCategoryBySlug(category)
  if (!cat) return {}

  const t = await getTranslations({ locale, namespace: 'catalog' })
  const name = pickCategoryName(cat, locale)

  // Provider set drives both the borough-specific title and the noindex rule.
  const all = (await listProvidersByCategory(cat.id)).filter(isServiceEligible)
  const boroughs = boroughsOf(all)
  const sp = await searchParams
  const borough = sp.borough && boroughs.includes(sp.borough) ? sp.borough : ''

  const title = borough
    ? t('seoTitleBorough', { category: name, borough })
    : t('seoTitle', { category: name })
  const description = borough
    ? t('seoDescriptionBorough', { category: name, borough })
    : t('seoDescription', { category: name })

  // Thin categories (and any filtered view) stay out of the index; links still followed.
  const indexable = all.length >= MIN_INDEXABLE && !borough && !sp.travels && !sp.verified

  return {
    title,
    description,
    robots: indexable ? undefined : { index: false, follow: true },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>
  searchParams: Promise<SearchParams>
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
  const travels = sp.travels === '1'
  const verifiedOnly = sp.verified === '1'

  const faceted = filterByFacets(filterByBorough(all, borough || null), {
    travels,
    verifiedOnly,
  })
  const filtered = rankProviders(faceted, { locale, sort, categorySlug: category })
  const cards = filtered.map((p) => toCard(p, category, locale))

  const t = await getTranslations('catalog')
  const tr = await getTranslations('request')
  const isEmpty = all.length === 0

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-4">
        <BackButton />
        <div className="py-6">
          <h1 className="text-title font-extrabold tracking-tight">{pickCategoryName(cat, locale)}</h1>
          <p className="mt-1 text-body text-slate-500">
            {t('providersCount', { count: all.length })}
          </p>
        </div>

        {all.length > 0 && (
          <div className="mb-6">
            <CategoryFilters
              boroughs={boroughs}
              current={{ borough, sort, travels, verifiedOnly }}
            />
          </div>
        )}

        {/* Empty category (idea #1): invite masters to list, before the request path. */}
        {isEmpty && (
          <div className="mb-6">
            <InfoBlock
              icon={IconBriefcase}
              title={t('emptyCallTitle')}
              subtitle={t('emptyCallBody')}
            />
            <div className="mt-3">
              <ButtonLink href="/for-business" className="w-full sm:w-auto">
                {t('emptyCallCta')}
              </ButtonLink>
            </div>
          </div>
        )}

        {/* Request is the main path (REQUESTS 12.2): "any master" for this category. */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
          <p className="text-body text-slate-500">{tr('leaveRequest')}</p>
          <ButtonLink href={`/request?category=${category}`}>{tr('submit')}</ButtonLink>
        </div>

        {isEmpty ? null : cards.length === 0 ? (
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
