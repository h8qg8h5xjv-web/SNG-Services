'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
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
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 p-4 text-center transition-colors hover:border-teal-700"
            >
              <CategoryIcon name={c.icon} className="h-6 w-6" />
              <span className="text-body font-semibold leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {items.length > INITIAL_VISIBLE && (
        <Button variant="link" onClick={() => setExpanded((v) => !v)} className="mt-3">
          {expanded ? t('less') : t('more')}
        </Button>
      )}
    </div>
  )
}
