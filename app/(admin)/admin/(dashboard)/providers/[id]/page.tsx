import { notFound } from 'next/navigation'
import {
  getAdminProvider,
  listCategories,
  listLanguages,
} from '@/lib/admin/data'
import ProviderForm from '@/components/admin/ProviderForm'
import InviteOwner from '@/components/admin/InviteOwner'
import LanguageVerification from '@/components/admin/LanguageVerification'
import ProviderCredentials from '@/components/admin/ProviderCredentials'
import { getBoroughOptions } from '@/lib/onboarding/reference'

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [provider, categories, languages, boroughs] = await Promise.all([
    getAdminProvider(id),
    listCategories(),
    listLanguages(),
    getBoroughOptions(),
  ])
  if (!provider) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-semibold">{provider.name_en}</h1>
      <ProviderForm provider={provider} categories={categories} languages={languages} boroughs={boroughs} />
      <LanguageVerification
        providerId={provider.id}
        categorySlug={categories.find((c) => c.id === provider.category_id)?.slug ?? null}
        languages={provider.provider_languages}
        reference={languages}
      />
      <ProviderCredentials provider={provider} />
      <InviteOwner providerId={provider.id} />
    </div>
  )
}
