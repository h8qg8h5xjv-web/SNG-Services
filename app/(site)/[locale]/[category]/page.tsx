import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import NightHeader from '@/components/site/NightHeader'
import CategoryToolbar from '@/components/catalog/CategoryToolbar'
import CategoryMapView from '@/components/map/CategoryMapView'
import ProviderGrid from '@/components/ProviderGrid'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCategoryBySlug, getHomeCategories } from '@/lib/queries/categories'
import { getFreeWindowsToday } from '@/lib/slots/service'
import { groupBySlug } from '@/lib/slots/windows'
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

  const [allRaw, windows, navCats] = await Promise.all([
    listProvidersByCategory(cat.id),
    getFreeWindowsToday(locale),
    getHomeCategories(),
  ])
  const all = allRaw.filter(isServiceEligible)
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

  // Today's real free windows in this category (the same list as the home city).
  const catWindows = windows.filter((w) => w.categorySlug === category)
  const windowsBySlug = groupBySlug(catWindows)

  const t = await getTranslations('catalog')
  const t2 = await getTranslations('cat2')
  const tl = await getTranslations('listing')
  const tr = await getTranslations('request')
  const name = pickCategoryName(cat, locale)
  const isEmpty = all.length === 0
  const n = (chunks: React.ReactNode) => <span className="n">{chunks}</span>

  return (
    <>
      <NightHeader>
        <nav className="crumbs" aria-label={tl('crumbsLabel')}>
          <Link href="/catalog">{tl('catalog')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{name}</span>
        </nav>
        <h1 className="ph1">{name}</h1>
        <p className="sub">
          {catWindows.length > 0
            ? t2.rich('categorySub', { places: all.length, windows: catWindows.length, n })
            : t2('categorySubNone', { places: all.length })}
        </p>
        <nav className="catnav" aria-label={t2('categoriesNav')}>
          {navCats.map(({ category: c }) => (
            <Link key={c.slug} href={`/${c.slug}`} className="chip" aria-current={c.slug === category ? 'page' : undefined}>
              {pickCategoryName(c, locale)}
            </Link>
          ))}
        </nav>
      </NightHeader>

      <div className="wrap page">
        {!isEmpty && (
          <CategoryToolbar boroughs={boroughList} facets={facets} current={{ boroughs, sort, travels, verifiedOnly, view }} />
        )}

        {isEmpty ? (
          <EmptyState
            className="mt-10"
            mark="—"
            title={t2('emptyCategoryTitle')}
            text={t('emptyCallBody')}
            action={
              <>
                <Link href={`/request?category=${category}`} className="btn btn-amber">
                  {t2('postRequest')}
                </Link>
                <Link href="/for-business" className="btn btn-line">
                  {t('emptyCallCta')}
                </Link>
              </>
            }
          />
        ) : (
          <>
            <div className="res-head">
              <h2 className="res-count" aria-live="polite">
                {t2('count', { n: cards.length })}
              </h2>
              <Link href={`/request?category=${category}`} className="btn btn-line btn-sm">
                {tr('submit')}
              </Link>
            </div>
            {cards.length === 0 ? (
              <EmptyState
                className="mt-6"
                mark="—"
                title={t2('emptyTitle')}
                text={t('emptyFiltered')}
                action={
                  <>
                    <Link href={`/${category}`} className="btn btn-ink" scroll={false}>
                      {t2('resetFilters')}
                    </Link>
                    <Link href={`/request?category=${category}`} className="btn btn-line">
                      {t2('postRequest')}
                    </Link>
                  </>
                }
              />
            ) : view === 'map' ? (
              <CategoryMapView cards={cards} />
            ) : (
              <>
                <ProviderGrid cards={cards} surface="category" responseMins={responseMins} windowsBySlug={windowsBySlug} />
                <TrackImpressions
                  surface="category"
                  locale={locale}
                  items={cards.map((c, i) => ({ providerId: c.id, position: i + 1, categoryId: cat.id }))}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
