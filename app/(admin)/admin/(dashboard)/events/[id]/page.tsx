import { notFound } from 'next/navigation'
import { getAdminEvent, listProviderOptions } from '@/lib/admin/data'
import EventForm from '@/components/admin/EventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, providerOptions] = await Promise.all([
    getAdminEvent(id),
    listProviderOptions(),
  ])
  if (!event) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-semibold">{event.title_en}</h1>
      <EventForm event={event} providerOptions={providerOptions} />
    </div>
  )
}
