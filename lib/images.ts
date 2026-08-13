// A cover_image value is either a full external URL (e.g. a picsum placeholder)
// or a path inside a Supabase Storage bucket. This resolves both, so switching
// demo placeholders for real uploads later needs no code change.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const DEFAULT_BUCKET = 'images'

export function resolveImageUrl(
  value: string | null | undefined,
  bucket: string = DEFAULT_BUCKET,
): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (!SUPABASE_URL) return null
  const path = value.replace(/^\/+/, '')
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
