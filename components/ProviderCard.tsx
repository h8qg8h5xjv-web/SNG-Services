import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { IconExternalLink, IconPhoto } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { resolveImageUrl } from '@/lib/images'
import { formatPriceRange } from '@/lib/format'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import type { FulfillmentType } from '@/types/database'

const BADGE: Record<FulfillmentType, { key: string; className: string }> = {
  native_booking: {
    key: 'fulfillment.nativeBadge',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  external_order: {
    key: 'fulfillment.externalBadge',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  enquiry: {
    key: 'fulfillment.enquiryBadge',
    className: 'bg-foreground/10 text-foreground/70',
  },
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
  const image = resolveImageUrl(card.coverImage)
  const href = surface
    ? `/${card.categorySlug}/${card.slug}?from=${surface}`
    : `/${card.categorySlug}/${card.slug}`

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-black/10 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
    >
      <div className="relative aspect-[4/3] w-full bg-foreground/5">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/25">
            <IconPhoto className="h-8 w-8" stroke={1.5} />
          </div>
        )}
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}
        >
          {card.fulfillment === 'external_order' && (
            <IconExternalLink className="h-3 w-3" stroke={2} />
          )}
          {t(badge.key)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-medium leading-snug">{card.name}</h3>
        <p className="text-sm text-foreground/60">{card.borough}</p>
        {card.fulfillment !== 'external_order' && (
          <p className="mt-1 text-sm font-medium">
            {card.priceRange
              ? formatPriceRange(card.priceRange.min, card.priceRange.max)
              : t('catalog.priceOnRequest')}
          </p>
        )}
      </div>
    </Link>
  )
}
