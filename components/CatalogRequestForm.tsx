'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { submitCatalogRequest } from '@/lib/catalog-requests/actions'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field, describedBy } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Consent from '@/components/Consent'
import { NO_CATEGORY } from '@/lib/onboarding/validate'
import type { CategoryOption } from '@/lib/onboarding/reference'

type FieldError = 'badCategory' | 'needSuggestion' | 'badBorough'

// "Get into the catalog" lead form. Registration is invite-only — this only
// sends a request to the admin, it never creates a card (CABINETS §3).
// Category and district are picked from the reference lists; «Моей категории
// нет» adds a suggestion the admin maps later — it never creates a category.
export default function CatalogRequestForm({
  categories,
  boroughs,
}: {
  categories: CategoryOption[]
  boroughs: string[]
}) {
  const t = useTranslations('forBusiness')
  const t2 = useTranslations('forBusiness2')
  const to = useTranslations('onboarding')
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [borough, setBorough] = useState('')
  const [fieldError, setFieldError] = useState<FieldError | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setFieldError(null)
    // The same checks run on the server; these only save a round trip.
    if (!category) return setFieldError('badCategory')
    if (category === NO_CATEGORY && !suggestion.trim()) return setFieldError('needSuggestion')
    if (!borough) return setFieldError('badBorough')
    setPending(true)
    const res = await submitCatalogRequest({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      contactEmail: email.trim() === '' ? null : email.trim(),
      contactPhone: phone.trim() === '' ? null : phone.trim(),
      categoryId: category,
      categorySuggestion: category === NO_CATEGORY ? suggestion : null,
      borough,
      message: message.trim() === '' ? null : message.trim(),
    })
    setPending(false)
    if (res.ok) setDone(true)
    else if (res.error === 'badCategory' || res.error === 'needSuggestion' || res.error === 'badBorough') setFieldError(res.error)
    else setError(res.error === 'needContact' ? t('needContact') : t('formError'))
  }

  function again() {
    setBusinessName('')
    setMessage('')
    setSuggestion('')
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
      <Field id="cr-category" label={to('category')} error={fieldError === 'badCategory' ? to('badCategory') : null}>
        <Select
          id="cr-category"
          value={category}
          onChange={(v) => {
            setCategory(v)
            if (fieldError === 'badCategory' || fieldError === 'needSuggestion') setFieldError(null)
          }}
          options={[
            ...categories.map((c) => ({ value: c.id, label: c.name })),
            { value: NO_CATEGORY, label: to('noCategory') },
          ]}
          placeholder={to('categoryPlaceholder')}
          ariaLabel={to('category')}
          title={to('category')}
          invalid={fieldError === 'badCategory'}
          describedBy={describedBy('cr-category', null, fieldError === 'badCategory')}
          className="w-full"
        />
      </Field>
      <Field id="cr-borough" label={to('borough')} error={fieldError === 'badBorough' ? to('badBorough') : null}>
        <Select
          id="cr-borough"
          value={borough}
          onChange={(v) => {
            setBorough(v)
            if (fieldError === 'badBorough') setFieldError(null)
          }}
          options={boroughs.map((b) => ({ value: b, label: b }))}
          placeholder={to('boroughPlaceholder')}
          ariaLabel={to('borough')}
          title={to('borough')}
          searchable
          searchPlaceholder={to('boroughSearch')}
          invalid={fieldError === 'badBorough'}
          describedBy={describedBy('cr-borough', null, fieldError === 'badBorough')}
          className="w-full"
        />
      </Field>
      {category === NO_CATEGORY && (
        <Field
          id="cr-suggestion"
          label={to('suggestion')}
          hint={to('suggestionHint')}
          error={fieldError === 'needSuggestion' ? to('needSuggestion') : null}
          className="full"
        >
          <Input
            id="cr-suggestion"
            value={suggestion}
            maxLength={200}
            onChange={(e) => {
              setSuggestion(e.target.value)
              if (fieldError === 'needSuggestion') setFieldError(null)
            }}
            aria-invalid={fieldError === 'needSuggestion' || undefined}
            aria-describedby={describedBy('cr-suggestion', true, fieldError === 'needSuggestion')}
          />
        </Field>
      )}
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
