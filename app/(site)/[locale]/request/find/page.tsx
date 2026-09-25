import { cookies } from 'next/headers'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { EmptyState } from '@/components/ui/EmptyState'
import ProviderGrid from '@/components/ProviderGrid'
import { Link } from '@/i18n/navigation'
import { listProvidersByCategory } from '@/lib/queries/providers'
import { getCategoryBySlug } from '@/lib/queries/categories'
import { createClient } from '@/lib/supabase/server'
import { toCard, isServiceEligible } from '@/lib/catalog/transform'
import { matchCategory } from '@/lib/requests/match-category'
import { recordSearchEmpty } from '@/lib/tracking/events'
import { pickCategoryName } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'

export default async function RequestFindPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const q = (await searchParams).q?.trim() ?? ''
  const t = await getTranslations('request')
  const tl = await getTranslations('listing')
  const tn = await getTranslations('nav')
  const supabase = await createClient()

  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_ru, sort_order')
    .order('sort_order', { ascending: true })
  const categories = cats ?? []
  const matchedSlug = q ? matchCategory(q, categories) : null
  const category = matchedSlug ? await getCategoryBySlug(matchedSlug) : null

  // Not recognised → log it and offer manual category choice (REQUESTS 12.2).
  if (!category) {
    if (q) {
      const sessionId = (await cookies()).get('sng_sid')?.value ?? null
      await recordSearchEmpty(q, sessionId, locale)
    }
    return (
      <div className="wrap page">
        <nav className="crumbs" aria-label={tl('crumbsLabel')}>
          <Link href="/">{tn('home')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t('chooseCategory')}</span>
        </nav>
        <EmptyState mark="?" headingLevel={1} title={t('chooseCategory')} text={t('notRecognised', { query: q })} />
        <div className="dchips mt-8">
          {categories.map((c) => (
            <Link key={c.slug} href={`/request?category=${c.slug}`} className="dchip">
              {pickCategoryName(c, locale)}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const providers = (await listProvidersByCategory(category.id)).filter(isServiceEligible)
  const cards = providers.map((p) => toCard(p, category.slug, locale))

  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label={tl('crumbsLabel')}>
        <Link href="/">{tn('home')}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{pickCategoryName(category, locale)}</span>
      </nav>
      <h1 className="ph1">{t('foundFor', { category: pickCategoryName(category, locale) })}</h1>

      {/* Request is the main path — offered prominently above the masters. */}
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="muted">{t('leaveRequest')}</p>
        <Link href={`/request?category=${category.slug}`} className="btn btn-amber">
          {t('submit')}
        </Link>
      </div>

      <div className="find-list">
        {cards.length > 0 ? (
          <ProviderGrid cards={cards} surface="search" />
        ) : (
          <EmptyState mark="—" text={t('noMastersYet')} />
        )}
      </div>
    </div>
  )
}
