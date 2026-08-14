import { notFound } from 'next/navigation'
import {
  getAdminProvider,
  listCategories,
  listLanguages,
} from '@/lib/admin/data'
import ProviderForm from '@/components/admin/ProviderForm'
import InviteOwner from '@/components/admin/InviteOwner'
import LanguageVerification from '@/components/admin/LanguageVerification'

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [provider, categories, languages] = await Promise.all([
    getAdminProvider(id),
    listCategories(),
    listLanguages(),
  ])
  if (!provider) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{provider.name_en}</h1>
      <ProviderForm provider={provider} categories={categories} languages={languages} />
      <LanguageVerification
        providerId={provider.id}
        languages={provider.provider_languages}
        reference={languages}
      />
      <InviteOwner providerId={provider.id} />
    </div>
  )
}
