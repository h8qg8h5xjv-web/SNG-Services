'use client'

import { useSyncExternalStore } from 'react'
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
      <h2 className="mb-3 text-lg font-medium">{t('recentlyViewed')}</h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((item) => {
          const image = resolveImageUrl(item.coverImage)
          return (
            <li key={item.slug} className="w-40 shrink-0 snap-start">
              <Link
                href={`/${item.categorySlug}/${item.slug}`}
                className="block overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
              >
                <div className="relative aspect-[4/3] w-full bg-foreground/5">
                  {image && (
                    <Image src={image} alt="" fill sizes="160px" className="object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-foreground/60">{item.borough}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
