'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { IconPhoto, IconX, IconStar, IconHome, IconUpload } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Field } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
import { saveCabinetProfile, uploadCabinetPhoto } from '@/lib/business/actions'
import { resolveImageUrl } from '@/lib/images'
import type { CabinetProfile } from '@/lib/business/data'

const MAX_PHOTOS = 6

export default function ProfileForm({ profile }: { profile: CabinetProfile }) {
  const t = useTranslations('business.profile')
  const tc = useTranslations('cabinet2')
  const [descriptionRu, setDescriptionRu] = useState(profile.descriptionRu ?? '')
  const [descriptionEn, setDescriptionEn] = useState(profile.descriptionEn ?? '')
  const [borough, setBorough] = useState(profile.borough)
  const [address, setAddress] = useState(profile.address ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [website, setWebsite] = useState(profile.website ?? '')
  const [travels, setTravels] = useState(profile.travelsToClient)
  const [photos, setPhotos] = useState<string[]>(profile.photos)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setError('')
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) break
      const fd = new FormData()
      fd.append('photo', file)
      const res = await uploadCabinetPhoto(profile.id, fd)
      if (res.ok) setPhotos((prev) => [...prev, res.path].slice(0, MAX_PHOTOS))
      else setError(res.error)
    }
    setUploading(false)
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, j) => j !== i))
  }
  function makeCover(i: number) {
    setPhotos((prev) => {
      const next = [...prev]
      const [moved] = next.splice(i, 1)
      next.unshift(moved)
      return next
    })
  }

  function save() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const res = await saveCabinetProfile({
        providerId: profile.id,
        descriptionRu: descriptionRu.trim() || null,
        descriptionEn: descriptionEn.trim() || null,
        borough: borough.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        travelsToClient: travels,
        photos,
      })
      if (res.ok) setSaved(true)
      else setError(res.error)
    })
  }

  return (
    <div className="grid gap-5">
      <Field id="pf-desc-ru" label={t('descriptionRu')}>
        <Textarea id="pf-desc-ru" value={descriptionRu} onChange={(e) => setDescriptionRu(e.target.value)} rows={3} />
      </Field>
      <Field id="pf-desc-en" label={t('descriptionEn')}>
        <Textarea id="pf-desc-en" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} />
      </Field>

      <div className="ed-grid">
        <Field id="pf-borough" label={t('borough')}>
          <Input id="pf-borough" value={borough} onChange={(e) => setBorough(e.target.value)} />
        </Field>
        <Field id="pf-address" label={t('address')}>
          <Input id="pf-address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
        </Field>
        <Field id="pf-phone" label={t('phone')}>
          <Input id="pf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
        <Field id="pf-website" label={t('website')}>
          <Input id="pf-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} autoComplete="url" />
        </Field>
      </div>

      <div>
        <FilterChip active={travels} onClick={() => setTravels((v) => !v)}>
          <IconHome stroke={1.75} aria-hidden="true" />
          {t('travels')}
        </FilterChip>
      </div>

      <div className="field">
        <span className="lbl">{t('photos', { max: MAX_PHOTOS })}</span>
        {photos.length > 0 && (
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div key={p} className="ph">
                {resolveImageUrl(p) ? (
                  <Image src={resolveImageUrl(p)!} alt="" fill sizes="104px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-mute">
                    <IconPhoto stroke={1.5} aria-hidden="true" />
                  </span>
                )}
                {i === 0 ? (
                  <span className="tag">{t('cover')}</span>
                ) : (
                  <button type="button" onClick={() => makeCover(i)} aria-label={t('makeCover')} className="b-l">
                    <IconStar stroke={1.75} aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={() => removePhoto(i)} aria-label={t('removePhoto')} className="b-r">
                  <IconX stroke={1.75} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS && (
          <div>
            <label className={`btn btn-line btn-sm file-btn ${uploading ? 'is-busy' : ''}`}>
              <IconUpload stroke={1.75} aria-hidden="true" />
              {tc('addPhotos')}
              <input type="file" accept="image/*" multiple onChange={onPhotos} disabled={uploading} className="sr-only" />
            </label>
          </div>
        )}
      </div>

      <div className="ed-acts">
        <Button variant="ink" onClick={save} disabled={pending || uploading}>
          {pending ? t('saving') : t('save')}
        </Button>
        {saved && (
          <span className="msg-ok" role="status">
            {t('saved')}
          </span>
        )}
        {error && (
          <span className="msg-err-inline" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
