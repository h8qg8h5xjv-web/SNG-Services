import { listProviderOptions } from '@/lib/admin/data'
import EventForm from '@/components/admin/EventForm'

export default async function NewEventPage() {
  const providerOptions = await listProviderOptions()
  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-semibold">New event</h1>
      <EventForm event={null} providerOptions={providerOptions} />
    </div>
  )
}
