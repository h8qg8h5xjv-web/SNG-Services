import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { resolveImageUrl } from '@/lib/images'
import type { AvailableTodayProvider } from '@/lib/slots/service'

export default function AvailableToday({
  providers,
  locale,
}: {
  providers: AvailableTodayProvider[]
  locale: string
}) {
  const t = useTranslations('home')
  if (providers.length === 0) return null

  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="py-6">
      <h2 className="mb-3 text-lg font-medium">{t('availableToday')}</h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {providers.map((p) => {
          const image = resolveImageUrl(p.cover_image)
          return (
            <li key={p.slug} className="w-44 shrink-0 snap-start">
              <Link
                href={`/${p.categorySlug}/${p.slug}/book`}
                className="block overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
              >
                <div className="relative aspect-[4/3] w-full bg-foreground/5">
                  {image && (
                    <Image src={image} alt="" fill sizes="176px" className="object-cover" />
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-white">
                    {timeFmt.format(new Date(p.nextSlot))}
                  </span>
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{p.name_en}</p>
                  <p className="truncate text-xs text-foreground/60">{p.borough}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
