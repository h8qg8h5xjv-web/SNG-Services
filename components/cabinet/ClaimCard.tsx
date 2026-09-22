'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { acceptCardInvite } from '@/lib/cabinet/invite-actions'

// Runs the invite claim once the page loads (user is already signed in here).
export default function ClaimCard({ token }: { token: string }) {
  const t = useTranslations('cabinet.claim')
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const res = await acceptCardInvite(token)
      setState(res.ok ? 'done' : 'error')
    })()
  }, [token])

  if (state === 'working') return <p className="text-body text-slate-500">{t('working')}</p>
  if (state === 'error') return <p className="text-body text-red-700">{t('invalid')}</p>
  return (
    <div className="space-y-3">
      <p className="text-body font-semibold text-green-700">{t('success')}</p>
      <Link href="/cabinet/cards" className="text-body font-semibold text-accent hover:underline">
        {t('toCards')}
      </Link>
    </div>
  )
}
