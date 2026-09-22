'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { IconCircleCheck, IconClock } from '@tabler/icons-react'
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
    <div className="space-y-3">
      <p className="text-meta text-slate-500">{t('hint')}</p>
      <div className="flex flex-col gap-2">
        {all.map((l) => {
          const mine = byCode.get(l.code)
          const isClaimed = Boolean(mine)
          const verified = mine?.status === 'verified'
          return (
            <div key={l.code} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="text-body font-semibold">{l.name}</span>
                {isClaimed &&
                  (verified ? (
                    <span className="inline-flex items-center gap-1 text-meta text-green-700">
                      <IconCircleCheck className="h-4 w-4" stroke={2} /> {t('verified')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-meta text-slate-500">
                      <IconClock className="h-4 w-4" stroke={1.5} /> {t('pending')}
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => toggle(l.code, isClaimed)}
                disabled={pending}
                className={`min-h-9 rounded-full px-4 text-meta font-semibold transition-colors disabled:opacity-60 ${
                  isClaimed ? 'border-medium border-slate-900 text-slate-900' : 'bg-slate-900 text-white'
                }`}
              >
                {isClaimed ? t('remove') : t('claim')}
              </button>
            </div>
          )
        })}
      </div>
      {error && <p className="text-meta text-red-700">{error}</p>}
    </div>
  )
}
