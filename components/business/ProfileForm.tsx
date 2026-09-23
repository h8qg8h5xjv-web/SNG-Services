'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { IconPhoto, IconX, IconStar, IconHome, IconHomeFilled } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { saveCabinetProfile, uploadCabinetPhoto } from '@/lib/business/actions'
import { resolveImageUrl } from '@/lib/images'
import type { CabinetProfile } from '@/lib/business/data'

const MAX_PHOTOS = 6

export default function ProfileForm({ profile }: { profile: CabinetProfile }) {
  const t = useTranslations('business.profile')
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
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('descriptionRu')}</label>
        <Textarea value={descriptionRu} onChange={(e) => setDescriptionRu(e.target.value)} rows={3} className="w-full" />
      </div>
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('descriptionEn')}</label>
        <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} className="w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('borough')}</label>
          <Input value={borough} onChange={(e) => setBorough(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('address')}</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('phone')}</label>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('website')}</label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full" />
        </div>
      </div>

      {/* 3D toggle (§Эффекты): raised → pressed, icon outline→fill. */}
      <button
        type="button"
        onClick={() => setTravels((v) => !v)}
        aria-pressed={travels}
        className={`toggle-3d inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-meta font-semibold ${
          travels ? 'text-accent' : 'text-slate-700'
        }`}
      >
        {travels ? (
          <IconHomeFilled className="h-5 w-5" />
        ) : (
          <IconHome className="h-5 w-5" stroke={2} />
        )}
        {t('travels')}
      </button>

      <div>
        <label className="mb-1 block text-body text-slate-500">{t('photos', { max: MAX_PHOTOS })}</label>
        {photos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p} className="relative">
                <div className="relative h-24 w-24 overflow-hidden rounded-photo bg-slate-100">
                  {resolveImageUrl(p) ? (
                    <Image src={resolveImageUrl(p)!} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-slate-400">
                      <IconPhoto className="h-6 w-6" stroke={1.5} />
                    </span>
                  )}
                </div>
                {i === 0 ? (
                  <span className="absolute left-1 top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-label font-semibold text-white">
                    {t('cover')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(i)}
                    aria-label={t('makeCover')}
                    className="absolute left-1 top-1 rounded-full bg-slate-900/70 p-1 text-white"
                  >
                    <IconStar className="h-4 w-4" stroke={1.5} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={t('removePhoto')}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white"
                >
                  <IconX className="h-4 w-4" stroke={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_PHOTOS && (
          <input type="file" accept="image/*" multiple onChange={onPhotos} disabled={uploading} className="block text-body" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || uploading}>
          {pending ? t('saving') : t('save')}
        </Button>
        {saved && <span className="text-meta text-green-700">{t('saved')}</span>}
        {error && <span className="text-meta text-red-700">{error}</span>}
      </div>
    </div>
  )
}
