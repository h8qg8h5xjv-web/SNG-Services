// Approximate London borough adjacency, used by wave 2 of the match (neighbours).
// Only needs to be reasonable, not exact — it just widens the search one ring.
export const NEIGHBOURS: Record<string, string[]> = {
  Ealing: ['Hounslow', 'Hammersmith and Fulham', 'Brent', 'Harrow'],
  Brent: ['Ealing', 'Harrow', 'Barnet', 'Camden', 'City of Westminster', 'Kensington and Chelsea'],
  Hounslow: ['Ealing', 'Richmond upon Thames', 'Hammersmith and Fulham'],
  Camden: ['Barnet', 'Brent', 'City of Westminster', 'Islington'],
  Barnet: ['Brent', 'Camden', 'Enfield', 'Harrow'],
  Wandsworth: ['Lambeth', 'Merton', 'Hammersmith and Fulham', 'Richmond upon Thames', 'Kensington and Chelsea'],
  'Hammersmith and Fulham': ['Ealing', 'Hounslow', 'Kensington and Chelsea', 'Wandsworth', 'Richmond upon Thames'],
  Harrow: ['Ealing', 'Brent', 'Barnet'],
  Southwark: ['Lambeth', 'Tower Hamlets'],
  Croydon: ['Lambeth', 'Merton'],
  Newham: ['Tower Hamlets', 'Hackney'],
  'Tower Hamlets': ['Hackney', 'Newham', 'Southwark', 'Islington'],
  'City of Westminster': ['Camden', 'Kensington and Chelsea', 'Wandsworth', 'Lambeth', 'Brent'],
  Islington: ['Camden', 'Hackney', 'Tower Hamlets'],
  'Kensington and Chelsea': ['City of Westminster', 'Hammersmith and Fulham', 'Brent', 'Wandsworth'],
  Enfield: ['Barnet'],
  'Richmond upon Thames': ['Hounslow', 'Wandsworth', 'Hammersmith and Fulham', 'Merton'],
  Merton: ['Wandsworth', 'Croydon', 'Lambeth', 'Richmond upon Thames'],
  Lambeth: ['Wandsworth', 'Southwark', 'Croydon', 'Merton', 'City of Westminster'],
  Hackney: ['Islington', 'Tower Hamlets', 'Newham'],
}

export function neighboursOf(borough: string): string[] {
  return NEIGHBOURS[borough] ?? []
}
