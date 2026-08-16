import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'

// DESIGN-SYSTEM §5: empty state — icon, a line of text, an action. Text and the
// action label come from the caller (translations).
export function EmptyState({
  icon: IconCmp,
  text,
  action,
}: {
  icon?: Icon
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-200 p-8 text-center">
      {IconCmp && <IconCmp className="h-6 w-6 text-slate-400" stroke={1.5} />}
      <p className="text-slate-500">{text}</p>
      {action}
    </div>
  )
}
