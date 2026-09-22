import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconLanguage, IconBriefcase } from '@tabler/icons-react'
import { SectionHeading } from '@/components/ui/Section'
import { InfoBlock } from '@/components/ui/InfoBlock'
import { ButtonLink } from '@/components/ui/Button'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import HomeHowItWorks from '@/components/HomeHowItWorks'
import RecentlyViewed from '@/components/RecentlyViewed'
import CategoryGrid from '@/components/CategoryGrid'
import AvailableToday from '@/components/AvailableToday'
import HomeTabs from '@/components/HomeTabs'
import PlacesExplorer from '@/components/PlacesExplorer'
import ServiceNeedBar from '@/components/requests/ServiceNeedBar'
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
      <ServiceNeedBar />
      {/* Trust, not rating (DESIGN §5): we verify service language for everyone. */}
      <div className="py-2">
        <InfoBlock icon={IconLanguage} title={t('trust.homeTitle')} subtitle={t('trust.homeSubtitle')} />
      </div>
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
      {/* Dark block: title, trust line, search (DESIGN-SYSTEM §3). No gradient. */}
      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-page px-3.5 py-7 sm:px-6">
          <h1 className="text-title font-extrabold tracking-tight">{t('home.heroTitle')}</h1>
          <p className="mt-2 text-meta text-blue-200">{t('home.heroSubtitle')}</p>
          <div className="mt-4">
            <SearchBar />
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-page flex-1 px-3.5 pb-8 sm:px-6">
        <HomeHowItWorks />

        <div className="mb-2">
          <HomeTabs services={services} places={<PlacesExplorer places={placeCards} />} />
        </div>

        {/* For masters (idea #3): invite providers to receive requests. */}
        <section className="my-8 flex flex-col gap-3 rounded-lg bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-accent">
              <IconBriefcase className="h-6 w-6" stroke={1.5} />
            </span>
            <p className="text-body font-semibold">{t('home.masters.title')}</p>
          </div>
          <ButtonLink href="/for-business" className="w-full sm:w-auto">
            {t('home.masters.cta')}
          </ButtonLink>
        </section>
      </main>
    </>
  )
}
