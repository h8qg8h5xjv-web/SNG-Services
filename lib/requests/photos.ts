'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const MAX_PHOTOS = 5
const MAX_BYTES = 8 * 1024 * 1024

export type UploadResult = { ok: true; paths: string[] } | { ok: false; error: string }

// Guests have no auth, so they can't write to the admin-only 'images' bucket
// directly (0009 policy). The browser posts the files here and we upload with the
// service role. Random-UUID paths under requests/; the array is stored on the
// request and shown to masters in the broadcast (quote only).
export async function uploadRequestPhotos(formData: FormData): Promise<UploadResult> {
  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return { ok: true, paths: [] }
  if (files.length > MAX_PHOTOS) return { ok: false, error: `Не больше ${MAX_PHOTOS} фото` }

  const supabase = createAdminClient()
  const paths: string[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) return { ok: false, error: 'Только изображения' }
    if (file.size > MAX_BYTES) return { ok: false, error: 'Файл больше 8 МБ' }
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const path = `requests/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('images')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
    if (error) return { ok: false, error: error.message }
    paths.push(path)
  }
  return { ok: true, paths }
}
