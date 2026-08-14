'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { resolveImageUrl } from '@/lib/images'

const MAX_PHOTOS = 6

// Uploads to the public 'images' bucket (venues/ folder) and stores an ordered
// array of object paths. The first item is the cover. Drag a tile to reorder.
export default function VenuePhotos({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const room = MAX_PHOTOS - value.length
    if (room <= 0) {
      setError(`Не больше ${MAX_PHOTOS} фото`)
      return
    }
    setBusy(true)
    setError('')
    const supabase = createClient()
    const uploaded: string[] = []
    for (const file of files.slice(0, room)) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
      const path = `venues/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) {
        setError(uploadError.message)
        setBusy(false)
        return
      }
      uploaded.push(path)
    }
    setBusy(false)
    onChange([...value, ...uploaded])
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {value.map((path, i) => (
          <div
            key={path}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorder(dragIndex, i)
              setDragIndex(null)
            }}
            className="relative cursor-move"
          >
            <Image
              src={resolveImageUrl(path) ?? ''}
              alt=""
              width={128}
              height={96}
              className="h-24 w-32 rounded-lg object-cover"
              unoptimized
            />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-foreground/80 px-1.5 py-0.5 text-xs text-background">
                Обложка
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
              aria-label="Удалить фото"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {value.length < MAX_PHOTOS && (
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          disabled={busy}
          className="block text-sm"
        />
      )}
      <p className="text-xs text-foreground/50">
        До {MAX_PHOTOS} фото. Первое — обложка. Перетащи, чтобы поменять порядок.
      </p>
      {busy && <p className="text-sm text-foreground/60">Загрузка…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
