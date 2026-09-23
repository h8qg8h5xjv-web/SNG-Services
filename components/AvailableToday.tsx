'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { SectionHeading } from '@/components/ui/Section'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import SaveHeart from '@/components/SaveHeart'
import NoPhoto from '@/components/NoPhoto'
import { resolveImageUrl } from '@/lib/images'
import { dateTimeFormat } from '@/lib/intl'
import { useDistrict, sortByDistrict } from '@/lib/district'
import type { AvailableTodayProvider } from '@/lib/slots/service'

export default function AvailableToday({
  providers,
  locale,
}: {
  providers: AvailableTodayProvider[]
  locale: string
}) {
  const t = useTranslations('home')
  const district = useDistrict()
  // Reorder by the visitor's chosen area (§3): closest / same borough first.
  const ordered = useMemo(() => sortByDistrict(providers, district), [providers, district])
  if (providers.length === 0) return null

  const timeFmt = dateTimeFormat(locale, {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="py-6">
      <SectionHeading>{t('availableToday')}</SectionHeading>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {ordered.map((p) => {
          const image = resolveImageUrl(p.cover_image)
          return (
            <li key={p.slug} className="w-44 shrink-0 snap-start">
              {/* Vertical card in a horizontal lane (DESIGN §4): photo, name, borough. */}
                <Link
                  href={`/${p.categorySlug}/${p.slug}/book`}
                  className="block h-full overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-accent"
                >
                  <div className="relative aspect-photo w-full bg-slate-100">
                    {image ? (
                      <Image src={image} alt="" fill sizes="176px" className="object-cover" />
                    ) : (
                      <NoPhoto categorySlug={p.categorySlug} className="h-full w-full" />
                    )}
                    <SaveHeart slug={p.slug} />
                    <span className="absolute bottom-2 left-2 rounded-full bg-green-700 px-2 py-1 text-meta font-semibold text-white">
                      {t('freeAt', { time: timeFmt.format(new Date(p.nextSlot)) })}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="truncate font-bold">{p.name_en}</p>
                    <p className="truncate text-meta text-slate-500">{p.borough}</p>
                  </div>
                </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
