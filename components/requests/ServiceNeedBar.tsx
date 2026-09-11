'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconArrowRight } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

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
      <form onSubmit={onSubmit} className="flex w-full gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('needPlaceholder')}
          aria-label={t('needTitle')}
          className="flex-1"
        />
        <Button type="submit" aria-label={t('needGo')}>
          <IconArrowRight className="h-5 w-5" stroke={2} />
          <span className="sr-only sm:not-sr-only">{t('needGo')}</span>
        </Button>
      </form>
    </section>
  )
}
