'use client'

import { useEffect } from 'react'
import { pushRecent, type RecentItem } from '@/lib/recently-viewed'

// Records a provider view in localStorage. Rendered (invisibly) on the provider page.
export default function RecordRecentView({ item }: { item: RecentItem }) {
  useEffect(() => {
    pushRecent(item)
  }, [item])
  return null
}
