import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getMyProviderIds, getNewRequestCount } from '@/lib/business/data'

// Shown in the public header only when the signed-in user is a provider member.
// Anonymous visitors (the common case) get nothing here — the footer link is
// enough (CABINETS §2). One light query for anon; the heavier count runs only
// for actual members.
export default async function BusinessNavLink() {
  const providerIds = await getMyProviderIds()
  if (providerIds.length === 0) return null

  const t = await getTranslations('business')
  const count = await getNewRequestCount()

  return (
    <Link
      href="/business/requests"
      className="flex items-center gap-1.5 text-body font-semibold text-teal-700"
    >
      {t('myCabinet')}
      {count > 0 && (
        <span className="rounded-full bg-teal-700 px-2 py-0.5 text-meta font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  )
}
