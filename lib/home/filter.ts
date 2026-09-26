// Live filter for the home hero (DEMO_MAP §3.1 «Live filter»): typing narrows
// the city, the counter and «Свободно сегодня» together. Words longer than 2
// letters, crude stem (cut 2 letters off words longer than 5), each word also
// tried in the other keyboard layout, so "vfybrbh" still finds «маникюр».

import { toEnLayout, toRuLayout } from '../search/keyboard.ts'

export type FilterWindow = {
  slug: string
  categorySlug: string
  name: string
  serviceName: string
  borough: string
}

export type HomeFilter = {
  // null = no filter; [] = a query that matches nothing
  cats: string[] | null
  slugs: Set<string> | null
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

function stems(q: string): string[] {
  const out = new Set<string>()
  for (const variant of [q, toRuLayout(q), toEnLayout(q)]) {
    for (const w of norm(variant).split(/[\s,.;:!?()«»"'-]+/)) {
      if (w.length <= 2) continue
      out.add(w.length > 5 ? w.slice(0, -2) : w)
    }
  }
  return [...out]
}

export function filterFor(
  query: string,
  chip: string | null,
  windows: FilterWindow[],
  categoryNames: Record<string, string[]>,
): HomeFilter {
  if (chip) return { cats: [chip], slugs: null }
  const words = stems(query.trim())
  if (!words.length) return { cats: null, slugs: null }
  const slugs = new Set<string>()
  const cats = new Set<string>()
  for (const w of windows) {
    const hay = norm(
      [w.name, w.serviceName, w.borough, ...(categoryNames[w.categorySlug] ?? [])].join(' '),
    )
    if (words.some((s) => hay.includes(s))) {
      slugs.add(w.slug)
      cats.add(w.categorySlug)
    }
  }
  return { cats: [...cats], slugs }
}

export function applyFilter<T extends FilterWindow>(windows: T[], f: HomeFilter): T[] {
  if (f.slugs) return windows.filter((w) => f.slugs!.has(w.slug))
  if (f.cats) return windows.filter((w) => f.cats!.includes(w.categorySlug))
  return windows
}
