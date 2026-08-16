import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SectionHeading } from '@/components/ui/Section'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import RecentlyViewed from '@/components/RecentlyViewed'
import CategoryGrid from '@/components/CategoryGrid'
import AvailableToday from '@/components/AvailableToday'
import HomeTabs from '@/components/HomeTabs'
import PlacesExplorer from '@/components/PlacesExplorer'
import { getHomeCategories } from '@/lib/queries/categories'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { getAvailableTodayProviders } from '@/lib/slots/service'
import { pickCategoryName } from '@/lib/i18n/content'
import { toCard, isPlaceCard } from '@/lib/catalog/transform'

// Live "available today" data is request-time; never statically prerendered.
export const dynamic = 'force-dynamic'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [categories, availableToday, allProviders] = await Promise.all([
    getHomeCategories(),
    getAvailableTodayProviders(),
    listAllPublishedProviders(),
  ])
  const tiles = categories.map(({ category, count }) => ({
    slug: category.slug,
    name: pickCategoryName(category, locale),
    icon: category.icon,
    count,
  }))
  const placeCards = allProviders
    .map((p) => toCard(p, p.categories?.slug ?? '', locale))
    .filter(isPlaceCard)

  const services = (
    <>
      <RecentlyViewed />
      <AvailableToday providers={availableToday} locale={locale} />
      <section className="py-6">
        <SectionHeading>{t('home.categoriesTitle')}</SectionHeading>
        {tiles.length > 0 ? (
          <CategoryGrid items={tiles} />
        ) : (
          <p className="text-body text-slate-500">{t('empty.noResults')}</p>
        )}
      </section>
    </>
  )

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8">
        <section className="py-8">
          <h1 className="text-title font-semibold sm:text-title">{t('home.heroTitle')}</h1>
          <p className="mt-3 max-w-2xl text-slate-500">{t('home.heroSubtitle')}</p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </section>

        <div className="mb-2">
          <HomeTabs services={services} places={<PlacesExplorer places={placeCards} />} />
        </div>
      </main>
    </>
  )
}
