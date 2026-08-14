import Image from 'next/image'
import { resolveImageUrl } from '@/lib/images'

// A place's photo gallery. The first photo is the cover and is already shown as
// the hero, so the gallery lists the rest.
export default function VenueGallery({ photos }: { photos: string[] | null }) {
  const extra = (photos ?? []).slice(1)
  if (extra.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3">
      {extra.map((path) => {
        const src = resolveImageUrl(path)
        if (!src) return null
        return (
          <Image
            key={path}
            src={src}
            alt=""
            width={300}
            height={200}
            className="h-32 w-full rounded-lg object-cover"
            unoptimized
          />
        )
      })}
    </div>
  )
}
