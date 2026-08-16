import { useTranslations } from 'next-intl'
import { formatPriceRange } from '@/lib/format'
import { Card, CardMedia, CardBody } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import type { FulfillmentType } from '@/types/database'

const BADGE: Record<FulfillmentType, { key: string; tone: 'success' | 'neutral' }> = {
  native_booking: { key: 'fulfillment.nativeBadge', tone: 'success' },
  external_order: { key: 'fulfillment.externalBadge', tone: 'neutral' },
  enquiry: { key: 'fulfillment.enquiryBadge', tone: 'neutral' },
}

export default function ProviderCard({
  card,
  surface,
}: {
  card: ProviderCardVM
  surface?: string
}) {
  const t = useTranslations()
  const badge = BADGE[card.fulfillment]
  const href = surface
    ? `/${card.categorySlug}/${card.slug}?from=${surface}`
    : `/${card.categorySlug}/${card.slug}`

  return (
    <Card href={href} className="flex flex-col">
      <CardMedia
        src={card.coverImage}
        ratio="photo"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        overlay={
          <span className="absolute left-2 top-2">
            <StatusBadge tone={badge.tone}>{t(badge.key)}</StatusBadge>
          </span>
        }
      />
      <CardBody className="flex flex-1 flex-col gap-1">
        <h3 className="font-semibold">{card.name}</h3>
        <p className="text-meta text-slate-500">{card.borough}</p>
        {card.fulfillment !== 'external_order' && (
          <p className="mt-1 text-meta font-semibold">
            {card.priceRange
              ? formatPriceRange(card.priceRange.min, card.priceRange.max)
              : t('catalog.priceOnRequest')}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
