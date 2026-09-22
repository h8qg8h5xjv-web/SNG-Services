'use client'

import { useRouter, usePathname } from '@/i18n/navigation'
import { Select } from '@/components/ui/Input'
import type { MyProvider } from '@/lib/business/data'

// Shown only when a master manages more than one card: switches the active
// provider (?p) while staying on the current tab.
export default function ProviderPicker({
  providers,
  activeId,
}: {
  providers: MyProvider[]
  activeId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  if (providers.length < 2) return null
  return (
    <Select
      value={activeId}
      onChange={(e) => router.replace(`${pathname}?p=${e.target.value}`)}
      className="mb-4 w-full sm:w-auto"
    >
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  )
}
