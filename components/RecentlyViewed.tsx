'use client'

import { useSyncExternalStore } from 'react'
import { SectionHeading } from '@/components/ui/Section'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  readRecent,
  subscribeRecent,
  getServerRecent,
} from '@/lib/recently-viewed'
import { resolveImageUrl } from '@/lib/images'

export default function RecentlyViewed() {
  const t = useTranslations('home')
  const items = useSyncExternalStore(subscribeRecent, readRecent, getServerRecent)

  if (items.length === 0) return null

  return (
    <section className="py-6">
      <SectionHeading>{t('recentlyViewed')}</SectionHeading>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((item) => {
          const image = resolveImageUrl(item.coverImage)
          return (
            <li key={item.slug} className="w-40 shrink-0 snap-start">
              <Link
                href={`/${item.categorySlug}/${item.slug}`}
                className="block overflow-hidden rounded-lg border border-slate-200"
              >
                <div className="relative aspect-photo w-full bg-slate-100">
                  {image && (
                    <Image src={image} alt="" fill sizes="160px" className="object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-body font-semibold">{item.name}</p>
                  <p className="truncate text-meta text-slate-500">{item.borough}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
