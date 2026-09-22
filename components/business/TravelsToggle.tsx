'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FilterChip } from '@/components/ui/FilterChip'
import { setTravelsToClient } from '@/lib/business/actions'
import type { MyProvider } from '@/lib/business/data'

// Master toggles "I travel to the client" per provider (idea #5). Optimistic:
// flips immediately, reverts if the server action fails.
export default function TravelsToggle({ providers }: { providers: MyProvider[] }) {
  const t = useTranslations('business.settings')
  if (providers.length === 0) return null

  return (
    <section>
      <h2 className="mb-1 text-h2 font-semibold">{t('title')}</h2>
      <p className="mb-3 text-meta text-slate-500">{t('travelsHint')}</p>
      <div className="flex flex-col gap-2">
        {providers.map((p) => (
          <TravelsRow key={p.id} provider={p} showName={providers.length > 1} />
        ))}
      </div>
    </section>
  )
}

function TravelsRow({ provider, showName }: { provider: MyProvider; showName: boolean }) {
  const t = useTranslations('business.settings')
  const [on, setOn] = useState(provider.travelsToClient)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !on
    setOn(next)
    startTransition(async () => {
      const res = await setTravelsToClient({ providerId: provider.id, value: next })
      if (!res.ok) setOn(!next)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <FilterChip active={on} onClick={toggle} className={pending ? 'opacity-60' : ''}>
        {t('travels')}
      </FilterChip>
      {showName && <span className="truncate text-body text-slate-500">{provider.name}</span>}
    </div>
  )
}
