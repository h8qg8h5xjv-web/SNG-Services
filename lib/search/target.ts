// The one place that turns a typed query into a search navigation path. Pure and
// deterministic so «Найти»/Enter ALWAYS carry the text — the search bug that kept
// coming back was navigation that didn't derive from the input's value. Locale is
// added by the caller. Returns null for an empty query (nothing to do).
export function searchNavPath(rawQuery: string): string | null {
  const q = rawQuery.trim()
  if (!q) return null
  return `/search?q=${encodeURIComponent(q)}`
}
