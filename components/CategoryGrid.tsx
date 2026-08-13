'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import CategoryIcon from './CategoryIcon'

export type CategoryTile = {
  slug: string
  name: string
  icon: string
  count: number
}

const INITIAL_VISIBLE = 8

export default function CategoryGrid({ items }: { items: CategoryTile[] }) {
  const t = useTranslations('home')
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE)

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {visible.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/${c.slug}`}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-black/10 p-4 text-center transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
            >
              <CategoryIcon name={c.icon} className="h-7 w-7" />
              <span className="text-sm font-medium leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {items.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 min-h-11 rounded-lg px-4 text-sm font-medium text-foreground/70 underline-offset-4 hover:underline"
        >
          {expanded ? t('less') : t('more')}
        </button>
      )}
    </div>
  )
}
