'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconArrowRight, IconPencil } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'

// The central element of the Services tab (REQUESTS 12.2): describe the task in
// free text ("мастер по волосам", "убрать квартиру") → matching masters + the
// option to leave a request.
export default function ServiceNeedBar() {
  const t = useTranslations('request')
  const router = useRouter()
  const [q, setQ] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query) router.push(`/request/find?q=${encodeURIComponent(query)}`)
  }

  return (
    <section className="py-6">
      <h2 className="mb-2 text-h2 font-semibold">{t('needTitle')}</h2>
      {/* Field with an inner action (§Эффекты). */}
      <form onSubmit={onSubmit}>
        <div className="field-action min-h-12">
          <span className="field-action__icon">
            <IconPencil className="h-5 w-5" stroke={2} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('needPlaceholder')}
            aria-label={t('needTitle')}
            className="field-action__field min-h-11 text-body"
          />
          <button
            type="submit"
            aria-label={t('needGo')}
            className="field-action__btn focus-ring min-h-11 px-4 text-body"
          >
            <span className="sr-only sm:not-sr-only">{t('needGo')}</span>
            <IconArrowRight className="field-action__arrow h-5 w-5" stroke={2} />
          </button>
        </div>
      </form>
    </section>
  )
}
