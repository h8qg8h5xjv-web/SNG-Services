import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMapPin } from '@tabler/icons-react'
import NearExplorer from '@/components/map/NearExplorer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { getResponseMedians } from '@/lib/queries/response-time'
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

  // "Отвечает за N мин" (§5): median from request_targets for the shown providers.
  const medians = await getResponseMedians(mappable.map((c) => c.id))
  const responseMins: Record<string, number> = {}
  for (const [id, m] of medians) responseMins[id] = m

  return (
    <>
      {mappable.length === 0 ? (
        <div className="mx-auto w-full max-w-page flex-1 px-3.5 py-6 sm:px-6">
          <h1 className="text-title font-extrabold tracking-tight">{t('nav.near')}</h1>
          <div className="mt-4">
            <EmptyState
              icon={IconMapPin}
              text={t('catalog.emptyCategory')}
              action={<ButtonLink href="/">{t('nav.catalog')}</ButtonLink>}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <NearExplorer cards={mappable} responseMins={responseMins} />
        </div>
      )}
    </>
  )
}
