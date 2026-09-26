'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { setCabinetLanguage } from '@/lib/business/actions'
import { useRouter } from '@/i18n/navigation'
import type { CabinetLanguage } from '@/lib/business/data'

export default function LanguagesEditor({
  providerId,
  all,
  claimed,
}: {
  providerId: string
  all: { code: string; name: string }[]
  claimed: CabinetLanguage[]
}) {
  const t = useTranslations('business.languages')
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const byCode = new Map(claimed.map((c) => [c.code, c]))

  function toggle(code: string, isClaimed: boolean) {
    setError('')
    startTransition(async () => {
      const res = await setCabinetLanguage(providerId, code, !isClaimed)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div>
      <p className="muted">{t('hint')}</p>
      <ul className="mt-2">
        {all.map((l) => {
          const mine = byCode.get(l.code)
          const isClaimed = Boolean(mine)
          const verified = mine?.status === 'verified'
          return (
            <li key={l.code} className="lang-row">
              <div className="flex flex-wrap items-center gap-3">
                <b>{l.name}</b>
                {isClaimed &&
                  (verified ? (
                    <StatusBadge tone="success">{t('verified')}</StatusBadge>
                  ) : (
                    <StatusBadge>{t('pending')}</StatusBadge>
                  ))}
              </div>
              <Button variant={isClaimed ? 'line' : 'ink'} size="sm" onClick={() => toggle(l.code, isClaimed)} disabled={pending}>
                {isClaimed ? t('remove') : t('claim')}
              </Button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="msg-err-inline mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
