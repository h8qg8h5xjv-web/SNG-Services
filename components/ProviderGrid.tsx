import BusinessRow from '@/components/catalog/BusinessRow'
import FlipList from '@/components/catalog/FlipList'
import type { ProviderCardVM } from '@/lib/catalog/transform'
import type { FreeWindow } from '@/lib/slots/windows'

// The results list (DEMO_MAP §3.5): business rows that glide to their new
// place when filters change.
export default function ProviderGrid({
  cards,
  surface,
  responseMins,
  windowsBySlug,
}: {
  cards: ProviderCardVM[]
  surface?: string
  responseMins?: Record<string, number>
  windowsBySlug?: Record<string, FreeWindow[]>
}) {
  return (
    <FlipList className="results">
      {cards.map((card) => (
        <BusinessRow
          key={card.slug}
          card={card}
          surface={surface}
          responseMin={responseMins?.[card.id] ?? null}
          windows={windowsBySlug?.[card.slug]}
        />
      ))}
    </FlipList>
  )
}
