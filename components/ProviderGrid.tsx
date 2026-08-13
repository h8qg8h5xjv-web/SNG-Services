import ProviderCard from './ProviderCard'
import type { ProviderCardVM } from '@/lib/catalog/transform'

export default function ProviderGrid({
  cards,
  surface,
}: {
  cards: ProviderCardVM[]
  surface?: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <ProviderCard key={card.slug} card={card} surface={surface} />
      ))}
    </div>
  )
}
