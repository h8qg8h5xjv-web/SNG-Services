'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { resolveImageUrl } from '@/lib/images'

// Uploads to the public 'images' bucket and stores the object path. Also accepts
// a pasted external URL or path — cover_image resolves either (lib/images.ts).
export default function ImageUpload({
  value,
  onChange,
  folder = 'providers',
}: {
  value: string | null
  onChange: (value: string | null) => void
  folder?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    setBusy(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    onChange(path)
  }

  const preview = resolveImageUrl(value)

  return (
    <div className="space-y-2">
      {preview && (
        <Image
          src={preview}
          alt=""
          width={200}
          height={150}
          className="h-32 w-44 rounded-lg object-cover"
          unoptimized
        />
      )}
      <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="block text-body" />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="or paste an image URL / storage path"
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-body"
      />
      {busy && <p className="text-body text-slate-500">Uploading…</p>}
      {error && <p className="text-body text-red-700">{error}</p>}
    </div>
  )
}
