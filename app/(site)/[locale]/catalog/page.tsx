import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconSearch } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import NightHeader from '@/components/site/NightHeader'
import { getHomeCategories } from '@/lib/queries/categories'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { getFreeWindowsToday } from '@/lib/slots/service'
import { countByCategory } from '@/lib/slots/windows'
import { pickCategoryName, pickProviderContent } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'

const WHO_MAX = 4

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cat2' })
  return { title: t('catalogTitle') }
}

// Catalogue index (DEMO_MAP §3.4): one row per category — its name, who is
// listed, and today's real free windows.
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('cat2')
  const [categories, providers, windows] = await Promise.all([
    getHomeCategories(),
    listAllPublishedProviders(),
    getFreeWindowsToday(locale),
  ])
  const counts = countByCategory(windows)
  const byCategory = new Map<string, { slug: string; name: string }[]>()
  for (const p of providers) {
    const slug = p.categories?.slug
    if (!slug) continue
    const list = byCategory.get(slug) ?? []
    list.push({ slug: p.slug, name: pickProviderContent(p, p.provider_translations, locale).name })
    byCategory.set(slug, list)
  }
  const n = (chunks: React.ReactNode) => <span className="n">{chunks}</span>

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('catalogTitle')}</h1>
        <p className="sub">
          {windows.length > 0
            ? t.rich('catalogSub', { places: providers.length, windows: windows.length, n })
            : t('catalogSubNone', { places: providers.length })}
        </p>
        <form className="sbox" role="search" action={`/${locale}/search`} method="get">
          <IconSearch stroke={1.75} aria-hidden="true" />
          <label htmlFor="catalog-q" className="sr-only">
            {t('searchPlaceholder')}
          </label>
          <input id="catalog-q" name="q" type="search" enterKeyHint="search" placeholder={t('searchPlaceholder')} />
        </form>
      </NightHeader>

      <div className="wrap page">
        <ul className="cindex">
          {categories.map(({ category }) => {
            const who = byCategory.get(category.slug) ?? []
            const count = counts[category.slug] ?? 0
            return (
              <li key={category.slug}>
                <Link href={`/${category.slug}`} className="cname">
                  {pickCategoryName(category, locale)}
                </Link>
                <p className="cwho">
                  {who.slice(0, WHO_MAX).map((p, i) => (
                    <span key={p.slug}>
                      {i > 0 && ', '}
                      <Link href={`/${category.slug}/${p.slug}`}>{p.name}</Link>
                    </span>
                  ))}
                  {who.length > WHO_MAX && ` ${t('andMore', { n: who.length - WHO_MAX })}`}
                </p>
                <span className={count ? 'wn' : 'wn zero'}>
                  <i aria-hidden="true" />
                  {count ? t('windowsToday', { n: count }) : t('noWindowsToday')}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
