'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { submitCatalogRequest } from '@/lib/catalog-requests/actions'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconCircleCheck } from '@tabler/icons-react'

// "Get into the catalog" lead form. Registration is invite-only — this only
// sends a request to the admin, it never creates a card (CABINETS §3).
export default function CatalogRequestForm() {
  const t = useTranslations('forBusiness')
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [borough, setBorough] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    const res = await submitCatalogRequest({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      contactEmail: email.trim() === '' ? null : email.trim(),
      contactPhone: phone.trim() === '' ? null : phone.trim(),
      category: category.trim() === '' ? null : category.trim(),
      borough: borough.trim() === '' ? null : borough.trim(),
      message: message.trim() === '' ? null : message.trim(),
    })
    setPending(false)
    if (res.ok) setDone(true)
    else setError(res.error === 'needContact' ? t('needContact') : t('formError'))
  }

  if (done) {
    return <EmptyState icon={IconCircleCheck} text={t('sent')} />
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input required placeholder={t('businessName')} value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full" />
      <Input required placeholder={t('contactName')} value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        <Input type="tel" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
        <Input placeholder={t('category')} value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" />
        <Input placeholder={t('borough')} value={borough} onChange={(e) => setBorough(e.target.value)} className="w-full" />
      </div>
      <Textarea rows={3} placeholder={t('message')} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full" />
      {error && <p className="text-body text-red-700">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  )
}
