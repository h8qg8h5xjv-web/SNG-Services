import {
  sortProviders,
  type ProviderWithRelations,
  type SortKey,
} from '@/lib/catalog/transform'

export type RankingContext = {
  locale: string
  sort?: SortKey
  categorySlug?: string
  // Reserved for future paid promotion. A boost would be applied HERE, only
  // within already-relevant results, never more than one paid card per screen,
  // and always with a label visible before the click (DMCC Act 2024). Not
  // implemented yet — this is only the single seam every provider ordering
  // passes through.
}

/**
 * The one place provider lists are ordered. Every ORDER BY over providers in the
 * app routes through this, so a future boost has a single insertion point.
 */
export function rankProviders(
  providers: ProviderWithRelations[],
  context: RankingContext,
): ProviderWithRelations[] {
  return sortProviders(providers, context.sort ?? 'relevance', context.locale)
}
