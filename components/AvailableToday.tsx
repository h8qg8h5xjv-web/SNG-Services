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
      <h2 className="mb-3 text-h2 font-semibold">{t('availableToday')}</h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {providers.map((p) => {
          const image = resolveImageUrl(p.cover_image)
          return (
            <li key={p.slug} className="w-44 shrink-0 snap-start">
              <Link
                href={`/${p.categorySlug}/${p.slug}/book`}
                className="block overflow-hidden rounded-lg border border-slate-200"
              >
                <div className="relative aspect-photo w-full bg-slate-100">
                  {image && (
                    <Image src={image} alt="" fill sizes="176px" className="object-cover" />
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-green-700 px-2 py-0.5 text-meta font-semibold text-white">
                    {timeFmt.format(new Date(p.nextSlot))}
                  </span>
                </div>
                <div className="p-2">
                  <p className="truncate text-body font-semibold">{p.name_en}</p>
                  <p className="truncate text-meta text-slate-500">{p.borough}</p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
