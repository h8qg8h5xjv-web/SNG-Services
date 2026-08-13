'use client'

import { useEffect, useRef } from 'react'

export type ImpressionItem = {
  providerId: string
  position: number
  categoryId?: string | null
}

// Sends one batched impression request for a whole list when it renders — never
// one request per card. Uses sendBeacon so it doesn't delay navigation, and
// never throws.
export default function TrackImpressions({
  items,
  surface,
  locale,
}: {
  items: ImpressionItem[]
  surface: string
  locale: string
}) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || items.length === 0) return
    sent.current = true
    const events = items.map((i) => ({
      provider_id: i.providerId,
      event_type: 'impression',
      position: i.position,
      surface,
      category_id: i.categoryId ?? null,
      locale,
    }))
    const body = JSON.stringify({ events })
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (!navigator.sendBeacon('/api/track', blob)) throw new Error('beacon failed')
    } catch {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }, [items, surface, locale])

  return null
}
