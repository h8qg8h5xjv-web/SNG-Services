import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMapPin } from '@tabler/icons-react'
import Header from '@/components/Header'
import NearExplorer from '@/components/map/NearExplorer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { toCard } from '@/lib/catalog/transform'

export const dynamic = 'force-dynamic'

// "Рядом" (§11 + Maps §1): providers on an OpenStreetMap map. Mobile is a
// fullscreen map with a draggable sheet list; desktop splits list / map.
export default async function NearPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const providers = await listAllPublishedProviders()
  const cards = providers.map((p) => toCard(p, p.categories?.slug ?? '', locale))
  const mappable = cards.filter((c) => c.lat != null && c.lng != null)

  return (
    <>
      <Header />
      {mappable.length === 0 ? (
        <main className="mx-auto w-full max-w-page flex-1 px-3.5 py-6 sm:px-6">
          <h1 className="text-title font-extrabold tracking-tight">{t('nav.near')}</h1>
          <div className="mt-4">
            <EmptyState
              icon={IconMapPin}
              text={t('catalog.emptyCategory')}
              action={<ButtonLink href="/">{t('nav.catalog')}</ButtonLink>}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1">
          <NearExplorer cards={mappable} />
        </main>
      )}
    </>
  )
}
