'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { isOpenNow, type OpeningHours } from '@/lib/hours'

// Live "open now" text for the master header (DESIGN §7). Computed client-side in
// London time after mount, so a cached page never shows a stale state.
export default function OpenNowInline({ hours }: { hours: OpeningHours | null }) {
  const t = useTranslations('provider')
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    if (!hours) return
    const compute = () => setOpen(isOpenNow(hours))
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [hours])

  if (open === null) return null
  return (
    <span className={open ? 'status taken' : 'status declined'}>
      <i aria-hidden="true" />
      {open ? t('openNow') : t('closedNow')}
    </span>
  )
}
