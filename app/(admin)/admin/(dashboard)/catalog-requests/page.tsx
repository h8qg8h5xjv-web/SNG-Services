import { listCatalogRequests, listCategories } from '@/lib/admin/data'
import CatalogRequestStatusSelect from '@/components/admin/CatalogRequestStatusSelect'
import CatalogRequestCategorySelect from '@/components/admin/CatalogRequestCategorySelect'

export default async function AdminCatalogRequestsPage() {
  const [requests, categories] = await Promise.all([listCatalogRequests(), listCategories()])
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name_ru }))

  return (
    <div className="space-y-4">
      <h1 className="text-h2 font-semibold">Catalog requests</h1>
      <p className="text-body text-slate-500">
        Заявки на добавление в каталог с публичной страницы «Для бизнеса». Регистрация по
        приглашению — добавляй карточку вручную, если решишь пригласить. «Предложение» — бизнес
        не нашёл свою категорию: сопоставь заявку с существующей категорией в колонке Category.
      </p>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
          Пока нет заявок.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-body">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Business</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Category</th>
                <th className="p-3">District</th>
                <th className="p-3">Message</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="p-3 text-slate-500">
                    {new Date(r.created_at).toISOString().slice(0, 10)}
                  </td>
                  <td className="p-3">{r.business_name}</td>
                  <td className="p-3">
                    <div>{r.contact_name}</div>
                    {r.contact_email && <div className="text-meta text-slate-500">{r.contact_email}</div>}
                    {r.contact_phone && <div className="text-meta text-slate-500">{r.contact_phone}</div>}
                  </td>
                  <td className="p-3">
                    {r.category_suggestion && (
                      <p className="mb-2">
                        <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-meta font-semibold text-amber-900">
                          предложение
                        </span>
                        «{r.category_suggestion}»
                      </p>
                    )}
                    {r.category && !r.category_id && !r.category_suggestion && (
                      <p className="mb-2 text-meta text-slate-500">Free text (old form): «{r.category}»</p>
                    )}
                    <CatalogRequestCategorySelect id={r.id} categoryId={r.category_id} categories={categoryOptions} />
                  </td>
                  <td className="p-3 text-slate-500">{r.borough ?? '—'}</td>
                  <td className="p-3 text-slate-500">{r.message ?? '—'}</td>
                  <td className="p-3">
                    <CatalogRequestStatusSelect id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
