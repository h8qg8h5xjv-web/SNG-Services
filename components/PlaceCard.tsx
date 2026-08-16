'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconWorld, IconPhone } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { Card, CardMedia, CardBody } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { isOpenNow } from '@/lib/hours'
import type { ProviderCardVM } from '@/lib/catalog/transform'

// A place is browse-not-order (DESIGN §2в): links to the provider page, offers
// website / phone, and a live "open now" chip computed from London time after
// mount (never stale from caching).
export default function PlaceCard({ card }: { card: ProviderCardVM }) {
  const t = useTranslations()
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    if (!card.openingHours) return
    const compute = () => setOpen(isOpenNow(card.openingHours))
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [card.openingHours])

  return (
    <Card className="flex flex-col">
      <CardMedia
        src={card.coverImage}
        ratio="photo"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        overlay={
          open !== null && (
            <span className="absolute left-2 top-2">
              <StatusBadge tone={open ? 'success' : 'neutral'}>
                {open ? t('provider.openNow') : t('provider.closedNow')}
              </StatusBadge>
            </span>
          )
        }
      />
      <CardBody>
        <Link href={`/${card.categorySlug}/${card.slug}`} className="font-semibold hover:underline">
          {card.name}
        </Link>
        <p className="mt-0.5 text-meta text-slate-500">
          {[card.categoryName, card.borough].filter(Boolean).join(' · ')}
        </p>

        {(card.website || card.phone) && (
          <div className="mt-2 flex flex-wrap gap-2 text-meta">
            {card.website && (
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1"
              >
                <IconWorld className="h-5 w-5" stroke={1.5} /> {t('places.visitSite')}
              </a>
            )}
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1"
              >
                <IconPhone className="h-5 w-5" stroke={1.5} /> {t('places.call')}
              </a>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
