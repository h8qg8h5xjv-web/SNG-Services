import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMoodSad, IconBriefcase } from '@tabler/icons-react'
import BackButton from '@/components/BackButton'
import { ButtonLink } from '@/components/ui/Button'
import { InfoBlock } from '@/components/ui/InfoBlock'
import CategoryFilters from '@/components/CategoryFilters'
import CategoryMapView from '@/components/map/CategoryMapView'
import ProviderGrid from '@/components/ProviderGrid'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCategoryBySlug } from '@/lib/queries/categories'
import { listProvidersByCategory } from '@/lib/queries/providers'
import { getResponseMedians } from '@/lib/queries/response-time'
import { pickCategoryName } from '@/lib/i18n/content'
import { rankProviders } from '@/lib/ranking'
import {
  toCard,
  filterByBoroughs,
  filterByFacets,
  boroughsOf,
  hasVerifiedDocument,
  isServiceEligible,
  type SortKey,
} from '@/lib/catalog/transform'

const SORT_KEYS: SortKey[] = ['relevance', 'price', 'newest']
const MIN_INDEXABLE = 3

function parseSort(value: string | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : 'relevance'
}
function parseBoroughs(value: string | undefined, valid: string[]): string[] {
  if (!value) return []
  const set = new Set(valid)
  return value.split(',').map((s) => s.trim()).filter((b) => set.has(b))
}

type SearchParams = { borough?: string; sort?: string; travels?: string; verified?: string; view?: string }

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
  const all = (await listProvidersByCategory(cat.id)).filter(isServiceEligible)
  const boroughList = boroughsOf(all)
  const sp = await searchParams
  const boroughs = parseBoroughs(sp.borough, boroughList)
  const borough = boroughs.length === 1 ? boroughs[0] : ''

  const title = borough
    ? t('seoTitleBorough', { category: name, borough })
    : t('seoTitle', { category: name })
  const description = borough
    ? t('seoDescriptionBorough', { category: name, borough })
    : t('seoDescription', { category: name })
  const indexable = all.length >= MIN_INDEXABLE && boroughs.length === 0 && !sp.travels && !sp.verified

  return { title, description, robots: indexable ? undefined : { index: false, follow: true } }
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

  const all = (await listProvidersByCategory(cat.id)).filter(isServiceEligible)
  const boroughList = boroughsOf(all)
  const boroughs = parseBoroughs(sp.borough, boroughList)
  const sort = parseSort(sp.sort)
  const travels = sp.travels === '1'
  const verifiedOnly = sp.verified === '1'
  const view = sp.view === 'map' ? 'map' : 'list'

  const faceted = filterByFacets(filterByBoroughs(all, boroughs), { travels, verifiedOnly })
  const filtered = rankProviders(faceted, { locale, sort, categorySlug: category })
  const cards = filtered.map((p) => toCard(p, category, locale))

  // Facets for the live "Показать N" count; medians for "отвечает за N мин".
  const facets = all.map((p) => ({ borough: p.borough, travels: p.travels_to_client, verified: hasVerifiedDocument(p) }))
  const medians = await getResponseMedians(filtered.map((p) => p.id))
  const responseMins: Record<string, number> = {}
  for (const [id, m] of medians) responseMins[id] = m

  const t = await getTranslations('catalog')
  const tr = await getTranslations('request')
  const isEmpty = all.length === 0

  return (
    <>
      <div className="mx-auto w-full max-w-page flex-1 px-3.5 pb-8 pt-4 sm:px-6">
        <BackButton />
        <div className="py-5">
          <h1 className="text-title font-extrabold tracking-tight">{pickCategoryName(cat, locale)}</h1>
          <p className="mt-1 text-meta text-slate-500">{t('providersCount', { count: all.length })}</p>
          {all.length > 0 && <p className="mt-1 text-label text-slate-400">{t('orderNote')}</p>}
        </div>

        <div className="sm:flex sm:gap-6">
          {all.length > 0 && (
            <div className="mb-4 sm:mb-0">
              <CategoryFilters boroughs={boroughList} facets={facets} current={{ boroughs, sort, travels, verifiedOnly, view }} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Request path — main route for "any master". */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-slate-200 bg-white p-4">
              <p className="text-body text-slate-500">{tr('leaveRequest')}</p>
              <ButtonLink href={`/request?category=${category}`}>{tr('submit')}</ButtonLink>
            </div>

            {isEmpty ? (
              <div className="rounded-card border border-slate-200 bg-white p-4">
                <InfoBlock icon={IconBriefcase} title={t('emptyCallTitle')} subtitle={t('emptyCallBody')} />
                <div className="mt-3">
                  <ButtonLink href="/for-business" className="w-full sm:w-auto">
                    {t('emptyCallCta')}
                  </ButtonLink>
                </div>
              </div>
            ) : cards.length === 0 ? (
              <EmptyState icon={IconMoodSad} text={t('emptyFiltered')} />
            ) : view === 'map' ? (
              <CategoryMapView cards={cards} />
            ) : (
              <>
                <ProviderGrid cards={cards} surface="category" responseMins={responseMins} />
                <TrackImpressions
                  surface="category"
                  locale={locale}
                  items={cards.map((c, i) => ({ providerId: c.id, position: i + 1, categoryId: cat.id }))}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
