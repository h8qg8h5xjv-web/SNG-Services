import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { IconPhoto, IconCircleCheck } from '@tabler/icons-react'
import { formatPrice } from '@/lib/format'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Tilt from '@/components/Tilt'
import SaveHeart from '@/components/SaveHeart'
import { resolveImageUrl } from '@/lib/images'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import type { FulfillmentType } from '@/types/database'

const BADGE: Record<FulfillmentType, { key: string; tone: 'success' | 'neutral' }> = {
  native_booking: { key: 'fulfillment.nativeBadge', tone: 'success' },
  external_order: { key: 'fulfillment.externalBadge', tone: 'neutral' },
  enquiry: { key: 'fulfillment.enquiryBadge', tone: 'neutral' },
}

// Horizontal list card (DESIGN §4): 92×92 photo left, details right. Trust in
// place of a rating — verified service languages (DESIGN §5). `index` is the list
// position (ordinal, not a score — DESIGN §5 forbids rating numbers).
export default function ProviderCard({
  card,
  surface,
  index,
}: {
  card: ProviderCardVM
  surface?: string
  index?: number
}) {
  const t = useTranslations()
  const badge = BADGE[card.fulfillment]
  const href = surface
    ? `/${card.categorySlug}/${card.slug}?from=${surface}`
    : `/${card.categorySlug}/${card.slug}`
  const image = resolveImageUrl(card.coverImage)

  const trust =
    card.verifiedLanguages.length === 1
      ? t('trust.oneVerified', { lang: card.verifiedLanguages[0] })
      : card.verifiedLanguages.length > 1
        ? t('trust.manyVerified', { langs: card.verifiedLanguages.join(', ') })
        : null

  return (
    <Tilt maxDeg={3} translateZ={6}>
      <Card href={href} className="flex h-full gap-3 p-3">
        <div className="relative size-23 shrink-0 overflow-hidden rounded-photo bg-slate-100">
          {image ? (
            <Image src={image} alt="" fill sizes="92px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-400">
              <IconPhoto className="h-8 w-8" stroke={1.5} />
            </span>
          )}
          <SaveHeart slug={card.slug} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-bold">
            {index != null && <span className="text-slate-400">{index}. </span>}
            {card.name}
          </h3>
          <p className="truncate text-meta text-slate-500">
            {[card.categoryName, card.borough].filter(Boolean).join(' · ')}
          </p>

          {trust ? (
            <p className="mt-1 flex items-center gap-1 text-meta font-semibold text-accent">
              <IconCircleCheck className="h-5 w-5 shrink-0" stroke={2} />
              <span className="truncate">{trust}</span>
            </p>
          ) : (
            card.fulfillment !== 'native_booking' && (
              <span className="mt-1">
                <StatusBadge tone={badge.tone}>{t(badge.key)}</StatusBadge>
              </span>
            )
          )}

          {card.fulfillment !== 'external_order' && (
            <p className="mt-auto pt-1 text-meta font-semibold">
              {card.priceRange
                ? `${t('catalog.from')} ${formatPrice(card.priceRange.min)}`
                : t('catalog.priceOnRequest')}
            </p>
          )}
        </div>
      </Card>
    </Tilt>
  )
}
