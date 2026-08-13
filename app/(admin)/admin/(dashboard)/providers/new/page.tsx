import { listCategories, listLanguages } from '@/lib/admin/data'
import ProviderForm from '@/components/admin/ProviderForm'

export default async function NewProviderPage() {
  const [categories, languages] = await Promise.all([
    listCategories(),
    listLanguages(),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New provider</h1>
      <ProviderForm provider={null} categories={categories} languages={languages} />
    </div>
  )
}
