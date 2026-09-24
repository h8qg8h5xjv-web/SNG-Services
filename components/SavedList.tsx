'use client'

import { useTranslations } from 'next-intl'
import { IconHeart } from '@tabler/icons-react'
import { EmptyState } from '@/components/ui/EmptyState'
import ProviderGrid from '@/components/ProviderGrid'
import { useSaved } from '@/lib/saved/use-saved'
import type { ProviderCardVM } from '@/lib/catalog/transform'

// Saved providers. The full published set is passed from the server; the saved
// slugs live in localStorage (client), so we filter here — preserving save order
// (newest first). Empty until mount (SSR snapshot is empty), then fills in.
export default function SavedList({ cards }: { cards: ProviderCardVM[] }) {
  const t = useTranslations('saved')
  const saved = useSaved()
  const bySlug = new Map(cards.map((c) => [c.slug, c]))
  const items = saved
    .map((s) => bySlug.get(s))
    .filter((c): c is ProviderCardVM => c != null)

  if (items.length === 0) {
    return <EmptyState icon={IconHeart} text={t('empty')} />
  }

  return (
    <ProviderGrid cards={items} />
  )
}
