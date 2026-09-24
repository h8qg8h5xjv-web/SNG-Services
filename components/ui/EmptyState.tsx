import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { Pane } from './Pane'

// v2 empty state (DEMO_MAP §4): dashed box with a dark window pane, a heading,
// what to do next and the button to do it. `night` for dusk sections.
export function EmptyState({
  icon: IconCmp,
  mark,
  title,
  text,
  action,
  night = false,
  className = '',
}: {
  icon?: Icon
  mark?: string
  title?: ReactNode
  text: ReactNode
  action?: ReactNode
  night?: boolean
  className?: string
}) {
  if (night) {
    return (
      <div className={`empty-night ${className}`}>
        {title && <strong>{title}</strong>}
        <p>{text}</p>
        {action && <div className="acts">{action}</div>}
      </div>
    )
  }
  return (
    <div className={`empty ${className}`}>
      <Pane off time={IconCmp ? <IconCmp stroke={1.75} aria-hidden="true" /> : (mark ?? '—')} />
      {title ? <h2>{title}</h2> : null}
      <p>{text}</p>
      {action && <div className="acts">{action}</div>}
    </div>
  )
}
