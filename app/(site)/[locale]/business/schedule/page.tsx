import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviders, getCabinetSchedule } from '@/lib/business/data'
import ProviderPicker from '@/components/business/ProviderPicker'
import ScheduleEditor from '@/components/business/ScheduleEditor'

export const dynamic = 'force-dynamic'

export default async function BusinessSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { p } = await searchParams
  const t = await getTranslations('business.tabs')

  const providers = await getMyProviders()
  const active = providers.find((x) => x.id === p) ?? providers[0]
  if (!active) return null
  const rows = await getCabinetSchedule(active.id)

  return (
    <div>
      <h1 className="mb-4 text-title font-extrabold tracking-tight">{t('schedule')}</h1>
      <ProviderPicker providers={providers} activeId={active.id} />
      <ScheduleEditor key={active.id} providerId={active.id} rows={rows} />
    </div>
  )
}
