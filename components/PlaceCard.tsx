'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { IconPhoto, IconWorld, IconPhone } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { resolveImageUrl } from '@/lib/images'
import { isOpenNow } from '@/lib/hours'
import type { ProviderCardVM } from '@/lib/catalog/transform'

// A place is browse-not-order (DESIGN §2в): the card links to the provider page
// and offers website / phone, plus a live "open now" chip computed from London
// time after mount (so it is never stale from caching).
export default function PlaceCard({ card }: { card: ProviderCardVM }) {
  const t = useTranslations()
  const image = resolveImageUrl(card.coverImage)
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    if (!card.openingHours) return
    const compute = () => setOpen(isOpenNow(card.openingHours))
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [card.openingHours])

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      <Link href={`/${card.categorySlug}/${card.slug}`} className="block">
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
          {open !== null && (
            <span
              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs ${
                open
                  ? 'bg-green-500/90 text-white'
                  : 'bg-black/60 text-white'
              }`}
            >
              {open ? t('provider.openNow') : t('provider.closedNow')}
            </span>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/${card.categorySlug}/${card.slug}`} className="font-medium hover:underline">
          {card.name}
        </Link>
        <p className="mt-0.5 text-sm text-foreground/60">
          {[card.categoryName, card.borough].filter(Boolean).join(' · ')}
        </p>

        {(card.website || card.phone) && (
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {card.website && (
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-black/15 px-3 py-1 dark:border-white/20"
              >
                <IconWorld className="h-4 w-4" stroke={1.5} /> {t('places.visitSite')}
              </a>
            )}
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="inline-flex items-center gap-1 rounded-lg border border-black/15 px-3 py-1 dark:border-white/20"
              >
                <IconPhone className="h-4 w-4" stroke={1.5} /> {t('places.call')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
