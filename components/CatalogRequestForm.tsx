'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { submitCatalogRequest } from '@/lib/catalog-requests/actions'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field } from '@/components/ui/Input'
import Consent from '@/components/Consent'

// "Get into the catalog" lead form. Registration is invite-only — this only
// sends a request to the admin, it never creates a card (CABINETS §3).
export default function CatalogRequestForm() {
  const t = useTranslations('forBusiness')
  const t2 = useTranslations('forBusiness2')
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

  function again() {
    setBusinessName('')
    setMessage('')
    setDone(false)
  }

  if (done) {
    return (
      <div className="ok-state">
        <div className="ok-facade" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} className={i === 3 || i === 8 ? 'on' : i === 10 ? 'lighting' : undefined} />
          ))}
        </div>
        <h2 ref={focusOnMount} tabIndex={-1} className="h3">
          {t2('okTitle')}
        </h2>
        <p className="muted">{t('sent')}</p>
        <Button variant="plain" className="px-0" onClick={again}>
          {t2('again')}
        </Button>
      </div>
    )
  }

  const needContact = error === t('needContact')

  return (
    <form onSubmit={onSubmit} className="fgrid">
      <Field id="cr-contact" label={t('contactName')}>
        <Input id="cr-contact" required value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
      </Field>
      <Field id="cr-business" label={t('businessName')}>
        <Input id="cr-business" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />
      </Field>
      <Field id="cr-category" label={t('category')}>
        <Input id="cr-category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <Field id="cr-borough" label={t('borough')}>
        <Input id="cr-borough" value={borough} onChange={(e) => setBorough(e.target.value)} />
      </Field>
      <Field id="cr-phone" label={t('phone')}>
        <Input
          id="cr-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          aria-invalid={needContact || undefined}
        />
      </Field>
      <Field id="cr-email" label={t('email')}>
        <Input
          id="cr-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          aria-invalid={needContact || undefined}
        />
      </Field>
      <Field id="cr-message" label={t('message')} className="full">
        <Textarea id="cr-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      {error && (
        <p className="msg-err-inline full" role="alert">
          {error}
        </p>
      )}
      <Consent className="full" />
      <div className="acts full">
        <Button type="submit" variant="amber" disabled={pending}>
          {pending ? t('sending') : t('send')}
        </Button>
      </div>
    </form>
  )
}

function focusOnMount(el: HTMLHeadingElement | null) {
  el?.focus()
}
