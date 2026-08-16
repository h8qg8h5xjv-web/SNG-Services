'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconMapPin } from '@tabler/icons-react'
import PlaceCard from './PlaceCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProviderCardVM } from '@/lib/catalog/transform'

// Places lens (DESIGN §2в): browse by borough and category. The interactive map
// with clustering is a separate step; this is the list-by-borough half, which
// the map's bottom-sheet will reuse.
export default function PlacesExplorer({ places }: { places: ProviderCardVM[] }) {
  const t = useTranslations()
  const [borough, setBorough] = useState('')
  const [category, setCategory] = useState('')

  const boroughs = useMemo(
    () => Array.from(new Set(places.map((p) => p.borough))).sort((a, b) => a.localeCompare(b)),
    [places],
  )
  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of places) if (p.categorySlug) map.set(p.categorySlug, p.categoryName)
    return Array.from(map, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [places])

  const filtered = places.filter(
    (p) => (!borough || p.borough === borough) && (!category || p.categorySlug === category),
  )

  // Group by borough for the list.
  const groups = useMemo(() => {
    const byBorough = new Map<string, ProviderCardVM[]>()
    for (const p of filtered) {
      const list = byBorough.get(p.borough) ?? []
      list.push(p)
      byBorough.set(p.borough, list)
    }
    return Array.from(byBorough.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  return (
    <div className="py-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={borough}
          onChange={(e) => setBorough(e.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-transparent px-3 text-body"
        >
          <option value="">{t('places.allBoroughs')}</option>
          {boroughs.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-transparent px-3 text-body"
        >
          <option value="">{t('places.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Honest placeholder for the deferred map (chosen: no map dependency yet). */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-3 text-body text-slate-500">
        <IconMapPin className="h-4 w-4" stroke={1.5} /> {t('places.mapSoon')}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={IconMapPin} text={t('places.empty')} />
      ) : (
        <div className="space-y-6">
          {groups.map(([boroughName, cards]) => (
            <section key={boroughName}>
              <h3 className="mb-2 text-body font-semibold text-slate-500">{boroughName}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                  <PlaceCard key={card.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
