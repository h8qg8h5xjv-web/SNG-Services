import { toRuLayout, toEnLayout, translitLat, levenshtein } from './keyboard'

export type Suggestion = {
  kind: 'category' | 'provider' | 'borough' | 'service'
  label: string
  href: string
  sub?: string
}

export type Corpus = {
  categories: { name: string; slug: string }[]
  providers: { name: string; slug: string; categorySlug: string; borough: string }[]
  boroughs: string[]
  services: { name: string; categorySlug: string }[]
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

function variantsOf(q: string): string[] {
  return [...new Set([norm(q), norm(toRuLayout(q)), norm(toEnLayout(q))])].filter((v) => v.length > 0)
}

function makeMatcher(q: string): (name: string) => boolean {
  const vars = variantsOf(q)
  return (name: string) => {
    const nn = norm(name)
    const lat = translitLat(nn)
    const first = nn.split(/\s+/)[0]
    return vars.some(
      (v) => nn.includes(v) || lat.includes(v) || (v.length >= 3 && levenshtein(v, first) <= 1),
    )
  }
}

// Grouped suggestions (§11): categories, masters, districts, services. Typo- and
// layout-tolerant via the matcher. Capped so the dropdown stays short.
export function suggest(q: string, corpus: Corpus, limit = 8): Suggestion[] {
  if (q.trim().length < 2) return []
  const m = makeMatcher(q)
  const out: Suggestion[] = []

  for (const c of corpus.categories) {
    if (m(c.name)) out.push({ kind: 'category', label: c.name, href: `/${c.slug}` })
  }
  for (const p of corpus.providers) {
    if (out.length >= limit + 6) break
    if (m(p.name)) out.push({ kind: 'provider', label: p.name, sub: p.borough, href: `/${p.categorySlug}/${p.slug}` })
  }
  for (const b of corpus.boroughs) {
    if (m(b)) out.push({ kind: 'borough', label: b, href: `/search?q=${encodeURIComponent(b)}` })
  }
  for (const s of corpus.services) {
    if (out.length >= limit + 6) break
    if (m(s.name)) out.push({ kind: 'service', label: s.name, href: `/search?q=${encodeURIComponent(s.name)}` })
  }

  // Categories first, then the rest in insertion order; dedup by href.
  const seen = new Set<string>()
  return out
    .sort((a, b) => (a.kind === 'category' ? -1 : 0) - (b.kind === 'category' ? -1 : 0))
    .filter((s) => (seen.has(s.href) ? false : (seen.add(s.href), true)))
    .slice(0, limit)
}

// Best category for "Enter without picking a suggestion" (§11).
export function bestCategory(q: string, corpus: Corpus): string | null {
  const m = makeMatcher(q)
  const hit = corpus.categories.find((c) => m(c.name))
  return hit ? hit.slug : null
}
