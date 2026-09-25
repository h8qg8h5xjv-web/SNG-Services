// Which top-level section a (locale-less) pathname belongs to — drives
// aria-current in the header and the tab bar.
export type NavSection =
  | 'home'
  | 'search'
  | 'catalog'
  | 'near'
  | 'events'
  | 'saved'
  | 'cabinet'
  | 'business'
  | 'request'
  | 'legal'
  | 'other'

const FIXED: Record<string, NavSection> = {
  search: 'search',
  catalog: 'catalog',
  near: 'near',
  events: 'events',
  saved: 'saved',
  cabinet: 'cabinet',
  bookings: 'cabinet',
  requests: 'request',
  request: 'request',
  'for-business': 'business',
  terms: 'legal',
  privacy: 'legal',
}

export function navSection(pathname: string): NavSection {
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first) return 'home'
  // Anything else is a category, a listing or a booking flow: the catalogue.
  return FIXED[first] ?? 'catalog'
}
