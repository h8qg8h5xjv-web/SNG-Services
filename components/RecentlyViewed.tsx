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
  const t = useTranslations('home.v2')
  const items = useSyncExternalStore(subscribeRecent, readRecent, getServerRecent)

  if (items.length === 0) return null

  return (
    <section className="recent" aria-labelledby="recent-h">
      <div className="wrap">
        <h2 id="recent-h" className="h3">
          {t('recentTitle')}
        </h2>
        <ul>
          {items.map((item) => {
            const image = resolveImageUrl(item.coverImage)
            return (
              <li key={item.slug}>
                <Link href={`/${item.categorySlug}/${item.slug}`} className="card card-link">
                  <div className="thumbimg ph-media">
                    {image && <Image src={image} alt="" fill sizes="176px" className="object-cover" />}
                  </div>
                  <p>{item.name}</p>
                  <small>{item.borough}</small>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
