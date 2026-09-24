import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { IconLanguage, IconShieldCheck, IconHome, IconBolt } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import SaveHeart from '@/components/SaveHeart'
import { Pane } from '@/components/ui/Pane'
import { formatPrice } from '@/lib/format'
import { resolveImageUrl } from '@/lib/images'
import { windowHref, type FreeWindow } from '@/lib/slots/windows'
import type { ProviderCardVM } from '@/lib/catalog/transform'

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]!.toUpperCase()).join('') || '•'
}

// Business row (DEMO_MAP §4): thumb, name, facts, one line of description,
// trust badges from real data; on the right today's next free windows (real,
// each a link to the details step) and save / open. The title link covers the
// whole row; the windows and the heart sit above it.
export default function BusinessRow({
  card,
  windows = [],
  surface,
  responseMin,
}: {
  card: ProviderCardVM
  windows?: FreeWindow[]
  surface?: string
  responseMin?: number | null
}) {
  const t = useTranslations()
  const href = surface ? `/${card.categorySlug}/${card.slug}?from=${surface}` : `/${card.categorySlug}/${card.slug}`
  const image = resolveImageUrl(card.coverImage)
  const bookable = card.fulfillment === 'native_booking' && card.bookingEnabled

  return (
    <li className="card rrow" data-key={card.slug}>
      <div className="thumb" aria-hidden="true">
        {image ? <Image src={image} alt="" fill sizes="112px" className="object-cover" /> : initialsOf(card.name)}
      </div>
      <div>
        <h3>
          <Link href={href}>{card.name}</Link>
        </h3>
        <p className="rmeta">
          <span>{[card.categoryName, card.borough].filter(Boolean).join(' · ')}</span>
          {card.fulfillment !== 'external_order' && card.priceRange && (
            <span>{t.rich('cat2.from', { price: formatPrice(card.priceRange.min), b: (c) => <b>{c}</b> })}</span>
          )}
          {responseMin != null && (
            <span className="inline-flex items-center gap-1">
              <IconBolt className="h-4 w-4" stroke={1.75} aria-hidden="true" />
              {t('cat2.respondsIn', { min: responseMin })}
            </span>
          )}
          {card.entityType === 'place' && card.openingHours && (
            <span className={card.openNow ? 'status taken' : 'status declined'}>
              <i aria-hidden="true" />
              {card.openNow ? t('provider.openNow') : t('provider.closedNow')}
            </span>
          )}
        </p>
        {card.description && <p className="rdesc">{card.description}</p>}
        {(card.verifiedLanguages.length > 0 || card.documentsVerified || card.travelsToClient) && (
          <div className="rbadges">
            {card.verifiedLanguages.length > 0 && (
              <span className="pill">
                <IconLanguage stroke={1.75} aria-hidden="true" />
                {t('trust.langBadge')}
              </span>
            )}
            {card.documentsVerified && (
              <span className="pill">
                <IconShieldCheck stroke={1.75} aria-hidden="true" />
                {t('trust.docsBadge')}
              </span>
            )}
            {card.travelsToClient && (
              <span className="pill">
                <IconHome stroke={1.75} aria-hidden="true" />
                {t('catalog.filterTravels')}
              </span>
            )}
          </div>
        )}
        {card.unclaimed && <p className="rmeta">{t('provider.unclaimed')}</p>}
      </div>
      <div className="side">
        {bookable && windows.length > 0 ? (
          <>
            <span className="next-l">{t('cat2.nextToday')}</span>
            <div className="next">
              {windows.slice(0, 3).map((w) => (
                <Link key={w.id} href={windowHref(w)} className="tbtn" aria-label={`${card.name}, ${timeFmt.format(new Date(w.start))}`}>
                  <Pane thin time={timeFmt.format(new Date(w.start))} />
                </Link>
              ))}
            </div>
          </>
        ) : bookable ? (
          <span className="none-l">{t('cat2.noneToday')}</span>
        ) : null}
        <div className="side-acts">
          <SaveHeart slug={card.slug} variant="inline" />
          <Link href={href} className="btn btn-line btn-sm" tabIndex={-1} aria-hidden="true">
            {t('cat2.open')}
          </Link>
        </div>
      </div>
    </li>
  )
}
