import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMapPin } from '@tabler/icons-react'
import NearExplorer from '@/components/map/NearExplorer'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link } from '@/i18n/navigation'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { getResponseMedians } from '@/lib/queries/response-time'
import { getFreeWindowsToday } from '@/lib/slots/service'
import { groupBySlug } from '@/lib/slots/windows'
import { toCard } from '@/lib/catalog/transform'

export const dynamic = 'force-dynamic'

// «Рядом»: providers on the OpenStreetMap map (DEMO_MAP §3.7 layout), with
// today's real free windows on each row.
export default async function NearPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [providers, windows] = await Promise.all([listAllPublishedProviders(), getFreeWindowsToday(locale)])
  const cards = providers.map((p) => toCard(p, p.categories?.slug ?? '', locale))
  const mappable = cards.filter((c) => c.lat != null && c.lng != null)

  // "Отвечает за N мин": median from request_targets for the shown providers.
  const medians = await getResponseMedians(mappable.map((c) => c.id))
  const responseMins: Record<string, number> = {}
  for (const [id, m] of medians) responseMins[id] = m

  if (mappable.length === 0) {
    return (
      <div className="wrap page pt-10">
        <h1 className="ph1">{t('nav.near')}</h1>
        <EmptyState
          className="mt-6"
          icon={IconMapPin}
          text={t('catalog.emptyCategory')}
          action={
            <Link href="/catalog" className="btn btn-ink">
              {t('nav.catalog')}
            </Link>
          }
        />
      </div>
    )
  }
  return <NearExplorer cards={mappable} responseMins={responseMins} windowsBySlug={groupBySlug(windows)} />
}
