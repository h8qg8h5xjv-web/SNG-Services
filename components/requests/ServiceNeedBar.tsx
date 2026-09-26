'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

// Describe the task in free text ("мастер по волосам", "убрать квартиру") →
// matching masters + the option to leave a request (REQUESTS 12.2).
export default function ServiceNeedBar() {
  const t = useTranslations('request')
  const router = useRouter()
  const [q, setQ] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    router.push(query ? `/request/find?q=${encodeURIComponent(query)}` : '/request/find')
  }

  return (
    <form onSubmit={onSubmit} className="need">
      <label htmlFor="need-q" className="sr-only">
        {t('needTitle')}
      </label>
      <input
        id="need-q"
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('needPlaceholder')}
        enterKeyHint="send"
      />
      <button type="submit" className="btn btn-ink">
        {t('needGo')}
      </button>
    </form>
  )
}
