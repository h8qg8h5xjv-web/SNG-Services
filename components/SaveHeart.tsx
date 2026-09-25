'use client'

import { useTranslations } from 'next-intl'
import { IconHeart } from '@tabler/icons-react'
import { useSaved } from '@/lib/saved/use-saved'
import { toggleSaved } from '@/lib/saved/store'
import { toast } from '@/components/ui/Toast'

// Save a provider (localStorage, no account — see lib/saved/store). A real
// button: stopPropagation + preventDefault so a tap on a card saves instead of
// opening it. `overlay` sits on a photo; `inline` sits in a row of actions.
// Toggling toasts, with «Вернуть» after a removal (DEMO_MAP §3.2).
export default function SaveHeart({
  slug,
  variant = 'overlay',
}: {
  slug: string
  variant?: 'overlay' | 'inline'
}) {
  const t = useTranslations('saved')
  const tl = useTranslations('listing')
  const tc = useTranslations('common')
  const saved = useSaved()
  const active = saved.includes(slug)

  return (
    <button
      type="button"
      aria-label={active ? t('remove') : t('add')}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleSaved(slug)
        if (active) toast(tl('unsaved'), { label: tc('undo'), onClick: () => toggleSaved(slug) })
        else toast(tl('saved'))
      }}
      className={`icon-btn lined save-btn ${variant === 'overlay' ? 'save-overlay' : ''}`}
    >
      <IconHeart stroke={1.75} aria-hidden="true" />
    </button>
  )
}
