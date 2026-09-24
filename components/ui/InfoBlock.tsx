import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'

// v2 trust line (DEMO_MAP §3.1 `.trust`, compact): ink circle with a lamp-hi
// icon, a statement and an optional detail.
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
    <div className="info">
      <span className="info-ico" aria-hidden="true">
        <IconCmp stroke={1.75} />
      </span>
      <div className="min-w-0">
        <b>{title}</b>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
  )
}
