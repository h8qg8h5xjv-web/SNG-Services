import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import RequestForm from '@/components/requests/RequestForm'
import { createClient } from '@/lib/supabase/server'
import { getProviderDetail } from '@/lib/queries/providers'
import { pickProviderContent } from '@/lib/i18n/content'
import { getPriceGuide } from '@/lib/requests/price-guide'
import type { RequestType } from '@/types/database'

export const dynamic = 'force-dynamic'

type Search = { category?: string; provider?: string; borough?: string }

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Search>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const t = await getTranslations('request')
  const supabase = await createClient()

  if (!sp.category) notFound()
  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, default_request_type')
    .eq('slug', sp.category)
    .maybeSingle()
  if (!category) notFound()
  const requestType = category.default_request_type as RequestType

  // Specific-master mode when a provider slug is given, else "any master".
  const provider = sp.provider ? await getProviderDetail(sp.category, sp.provider) : null

  const { data: boroughRows } = await supabase
    .from('providers')
    .select('borough')
    .eq('status', 'published')
  const boroughs = Array.from(new Set((boroughRows ?? []).map((r) => r.borough))).sort((a, b) =>
    a.localeCompare(b),
  )

  const borough = provider?.borough ?? sp.borough ?? boroughs[0] ?? ''
  const guide = borough ? await getPriceGuide(category.id, borough, null) : null

  const services =
    provider?.services.map((s) => ({
      id: s.id,
      name: locale === 'ru' ? s.name_ru ?? s.name_en : s.name_en,
      duration_min: s.duration_min,
    })) ?? []

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="mb-6 text-title font-semibold">
          {provider
            ? t('titleSpecific')
            : t('titleAny')}
        </h1>
        <RequestForm
          categoryId={category.id}
          type={requestType}
          borough={provider ? provider.borough : null}
          boroughs={boroughs}
          services={services}
          targetProviderId={provider?.id ?? null}
          providerName={
            provider
              ? pickProviderContent(provider, provider.provider_translations, locale).name
              : undefined
          }
          priceGuide={guide}
        />
      </main>
    </>
  )
}
