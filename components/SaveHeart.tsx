'use client'

import { useTranslations } from 'next-intl'
import { IconHeart, IconHeartFilled } from '@tabler/icons-react'
import { useSaved } from '@/lib/saved/use-saved'
import { toggleSaved } from '@/lib/saved/store'

// The "save" heart on photos. Toggles a provider slug in localStorage (no account,
// see lib/saved/store). It's a real button — stopPropagation + preventDefault so a
// tap saves instead of opening the card it sits on. Filled + accent when saved.
export default function SaveHeart({ slug, big = false }: { slug: string; big?: boolean }) {
  const t = useTranslations('saved')
  const saved = useSaved()
  const active = saved.includes(slug)
  const box = big ? 'h-10 w-10' : 'h-8 w-8'
  const icon = big ? 'h-6 w-6' : 'h-5 w-5'

  return (
    <button
      type="button"
      aria-label={active ? t('remove') : t('add')}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleSaved(slug)
      }}
      className={`toggle-3d ${active ? 'is-on' : ''} absolute right-2 top-2 flex ${box} items-center justify-center rounded-full ${
        active ? 'text-accent' : 'text-slate-900'
      }`}
    >
      {active ? <IconHeartFilled className={icon} /> : <IconHeart className={icon} stroke={2} />}
    </button>
  )
}
