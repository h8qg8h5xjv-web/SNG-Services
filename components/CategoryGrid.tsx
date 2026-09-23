'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import Tilt from '@/components/Tilt'
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
      {/* §3: four tiles per row on mobile, seven on desktop. */}
      <ul className="stagger grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3">
        {visible.map((c) => (
          <li key={c.slug}>
            {/* Category tile: full 3D tilt with layered icon/label (task §4). */}
            <Tilt maxDeg={6} translateZ={12}>
              <Link
                href={`/${c.slug}`}
                className="preserve-3d flex h-full min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 p-2 text-center transition-colors hover:border-accent"
              >
                <span className="tilt-layer-2">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="tilt-layer-1 text-meta font-semibold leading-tight">{c.name}</span>
              </Link>
            </Tilt>
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
