import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { IconCircleCheck, IconShieldCheck, IconClock, IconCar, IconBolt } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { formatPrice } from '@/lib/format'
import SaveHeart from '@/components/SaveHeart'
import { resolveImageUrl } from '@/lib/images'
import type { ProviderCardVM } from '@/lib/catalog/transform'

// Six accent-ish tints for the no-photo avatar; picked deterministically by name.
const TINTS = ['bg-blue-600', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-600', 'bg-violet-600', 'bg-teal-600']
function tintFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]!.toUpperCase()).join('') || '•'
}

// DESIGN-SYSTEM §5: the ONE list card. Avatar · centre (name, meta, trust badges)
// · price/actions. Whole card is a link (stretched, so inner controls still work);
// the heart and desktop buttons sit above it.
export default function ProviderCard({
  card,
  surface,
  responseMin,
}: {
  card: ProviderCardVM
  surface?: string
  responseMin?: number | null
}) {
  const t = useTranslations()
  const href = surface
    ? `/${card.categorySlug}/${card.slug}?from=${surface}`
    : `/${card.categorySlug}/${card.slug}`
  const image = resolveImageUrl(card.coverImage)
  const wa = card.phone ? `https://wa.me/${card.phone.replace(/[^0-9]/g, '')}` : null

  const meta = [card.categoryName, card.borough].filter(Boolean).join(' · ')

  return (
    <div className="relative flex gap-3 rounded-card border border-slate-200 bg-white p-3 transition-colors hover:border-accent">
      {/* Stretched link: the whole card navigates. Text is pointer-events-none so
          clicks fall through to this; the heart/buttons re-enable pointer events. */}
      <Link href={href} aria-label={card.name} className="focus-ring absolute inset-0 z-0 rounded-card" />

      <div className="pointer-events-none relative size-16 shrink-0 overflow-hidden rounded-photo sm:size-21">
        {image ? (
          <Image src={image} alt="" fill sizes="84px" className="object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center text-name font-bold text-white ${tintFor(card.name)}`}>
            {initialsOf(card.name)}
          </span>
        )}
        <span className="pointer-events-auto relative z-10">
          <SaveHeart slug={card.slug} />
        </span>
      </div>

      <div className="pointer-events-none flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-name font-bold">{card.name}</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 truncate text-meta text-slate-500">
          {meta}
          {responseMin != null && (
            <span className="inline-flex items-center gap-0.5 text-slate-500">
              <IconBolt className="h-3.5 w-3.5" stroke={2} />
              {t('catalog.respondsIn', { min: responseMin })}
            </span>
          )}
        </p>

        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {card.verifiedLanguages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-accent-soft px-1.5 py-0.5 text-label font-semibold text-accent">
              <IconCircleCheck className="h-3.5 w-3.5" stroke={2} />
              {t('trust.langBadge')}
            </span>
          )}
          {card.openNow && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-green-100 px-1.5 py-0.5 text-label font-semibold text-green-700">
              <IconClock className="h-3.5 w-3.5" stroke={2} />
              {t('provider.openNow')}
            </span>
          )}
          {card.documentsVerified && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-accent-soft px-1.5 py-0.5 text-label font-semibold text-accent">
              <IconShieldCheck className="h-3.5 w-3.5" stroke={2} />
              {t('trust.docsBadge')}
            </span>
          )}
          {card.travelsToClient && (
            <span className="inline-flex items-center gap-1 rounded-badge bg-slate-100 px-1.5 py-0.5 text-label font-semibold text-slate-500">
              <IconCar className="h-3.5 w-3.5" stroke={2} />
              {t('catalog.filterTravels')}
            </span>
          )}
        </div>

        {card.unclaimed && (
          <p className="mt-1 truncate text-label text-slate-400">{t('provider.unclaimed')}</p>
        )}
      </div>

      <div className="pointer-events-none flex shrink-0 flex-col items-end justify-between">
        <div className="text-right">
          {card.fulfillment !== 'external_order' && (
            <p className="text-name font-extrabold tracking-tight">
              {card.priceRange
                ? `${t('catalog.from')} ${formatPrice(card.priceRange.min)}`
                : t('catalog.priceOnRequest')}
            </p>
          )}
        </div>
        <div className="pointer-events-auto relative z-10 mt-2 hidden flex-col gap-1.5 sm:flex">
          <Link
            href={href}
            className="press focus-ring inline-flex min-h-9 items-center justify-center rounded-control bg-accent px-3 text-meta font-semibold text-white hover:bg-blue-900"
          >
            {t('provider.book')}
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="press focus-ring inline-flex min-h-9 items-center justify-center rounded-control border border-slate-300 px-3 text-meta font-semibold text-slate-900 hover:bg-slate-50"
            >
              {t('provider.message')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
