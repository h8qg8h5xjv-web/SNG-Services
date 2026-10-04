'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { IconBuildingStore, IconChevronRight, IconSearch } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'
import { saveStartChoice } from '@/lib/cabinet/actions'
import type { StartChoice as Choice } from '@/lib/cabinet/data'

// Asked once, right after the first sign-in: what brought you here. «Я мастер»
// goes straight to creating a card; either way the cabinet stays the same.
// Hidden at once on click — if saving fails it simply shows up next visit.
export default function StartChoice() {
  const t = useTranslations('cabinet2')
  const router = useRouter()
  const [hidden, setHidden] = useState(false)
  const [pending, startTransition] = useTransition()

  if (hidden) return null

  function choose(choice: Choice) {
    startTransition(async () => {
      await saveStartChoice(choice)
      setHidden(true)
      if (choice === 'master') router.push('/cabinet/cards')
      else router.refresh()
    })
  }

  return (
    <section className="card cab-start" aria-labelledby="start-h">
      <h2 id="start-h" className="h3">
        {t('startTitle')}
      </h2>
      <div className="opts">
        <button type="button" className="opt" disabled={pending} onClick={() => choose('seeker')}>
          <IconSearch stroke={1.75} aria-hidden="true" />
          <span>
            <b>{t('startSeeker')}</b>
            <small>{t('startSeekerSub')}</small>
          </span>
          <IconChevronRight stroke={1.75} aria-hidden="true" />
        </button>
        <button type="button" className="opt" disabled={pending} onClick={() => choose('master')}>
          <IconBuildingStore stroke={1.75} aria-hidden="true" />
          <span>
            <b>{t('startMaster')}</b>
            <small>{t('startMasterSub')}</small>
          </span>
          <IconChevronRight stroke={1.75} aria-hidden="true" />
        </button>
      </div>
      <p className="muted">{t('startNote')}</p>
    </section>
  )
}
