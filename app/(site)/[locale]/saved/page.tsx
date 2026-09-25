import { getTranslations, setRequestLocale } from 'next-intl/server'
import NightHeader from '@/components/site/NightHeader'
import SavedList from '@/components/SavedList'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { toCard } from '@/lib/catalog/transform'

export const dynamic = 'force-dynamic'

// Saved list. Which providers are saved is client-only (localStorage), so we pass
// the full published set and SavedList filters it to the saved slugs.
export default async function SavedPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const providers = await listAllPublishedProviders()
  const cards = providers.map((p) => toCard(p, p.categories?.slug ?? '', locale))

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('saved.title')}</h1>
        <p className="sub">{t('cabinet2.savedText')}</p>
      </NightHeader>
      <div className="wrap page pt-8">
        <SavedList cards={cards} />
      </div>
    </>
  )
}
