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
  headingLevel = 2,
}: {
  icon?: Icon
  mark?: string
  title?: ReactNode
  text: ReactNode
  action?: ReactNode
  night?: boolean
  className?: string
  // 1 when the empty state is the whole page (it then carries the page's h1).
  headingLevel?: 1 | 2
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
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
      {title ? <Heading className={headingLevel === 1 ? 'h2' : undefined}>{title}</Heading> : null}
      <p>{text}</p>
      {action && <div className="acts">{action}</div>}
    </div>
  )
}
