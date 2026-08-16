import type { ReactNode } from 'react'
import Image from 'next/image'
import { IconPhoto } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { resolveImageUrl } from '@/lib/images'

// DESIGN-SYSTEM §5: ONE card for the whole project. Provider, event, booking and
// request all use it — media on top (optional) and a 12px-padded body.
export function Card({
  href,
  external = false,
  className = '',
  children,
}: {
  href?: string
  external?: boolean
  className?: string
  children: ReactNode
}) {
  const cls = `block overflow-hidden rounded-lg border border-slate-200 ${
    href ? 'transition-colors hover:border-teal-700' : ''
  } ${className}`
  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return <div className={cls}>{children}</div>
}

// The card's image area. Falls back to a calm photo-icon placeholder (a place
// entered from public data has no photo — we don't take others' images).
export function CardMedia({
  src,
  ratio = 'photo',
  sizes,
  priority = false,
  overlay,
}: {
  src: string | null
  ratio?: 'photo' | 'video'
  sizes?: string
  priority?: boolean
  overlay?: ReactNode
}) {
  const url = resolveImageUrl(src)
  const aspect = ratio === 'video' ? 'aspect-video' : 'aspect-photo'
  return (
    <div className={`relative w-full bg-slate-100 ${aspect}`}>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes={sizes ?? '(max-width: 640px) 100vw, 33vw'}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          <IconPhoto className="h-8 w-8" stroke={1.5} />
        </div>
      )}
      {overlay}
    </div>
  )
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`p-3 ${className}`}>{children}</div>
}
