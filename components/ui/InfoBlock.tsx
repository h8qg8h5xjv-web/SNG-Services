import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'

// DESIGN-SYSTEM §5/§6: info block — white card with a blue-50 icon square on the
// left and a title (600) + small subtitle on the right. Used for trust signals
// (language verified) and hints. Part of the closed component list.
export function InfoBlock({
  icon: IconCmp,
  title,
  subtitle,
}: {
  icon: Icon
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <IconCmp className="h-5 w-5" stroke={2} />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{title}</p>
        {subtitle && <p className="text-meta text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}
