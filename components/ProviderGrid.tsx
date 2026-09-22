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
    <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card, i) => (
        <ProviderCard key={card.slug} card={card} surface={surface} index={i + 1} />
      ))}
    </div>
  )
}
