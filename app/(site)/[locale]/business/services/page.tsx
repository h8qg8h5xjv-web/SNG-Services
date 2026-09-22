import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviders, getCabinetServices } from '@/lib/business/data'
import ProviderPicker from '@/components/business/ProviderPicker'
import ServicesEditor from '@/components/business/ServicesEditor'

export const dynamic = 'force-dynamic'

export default async function BusinessServicesPage({
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
  const services = await getCabinetServices(active.id)

  return (
    <div>
      <h1 className="mb-4 text-title font-extrabold tracking-tight">{t('services')}</h1>
      <ProviderPicker providers={providers} activeId={active.id} />
      <ServicesEditor key={active.id} providerId={active.id} services={services} />
    </div>
  )
}
