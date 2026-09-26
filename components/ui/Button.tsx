import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

// v2 buttons (DEMO_MAP §4). amber = the one primary action on a screen (book,
// find, send); ink = strong secondary on day; line = outline on day; ghost =
// outline on night; plain = text. Legacy names map onto them: primary → ink,
// secondary → line, link → an underlined text link.
type Variant = 'amber' | 'ink' | 'line' | 'ghost' | 'plain' | 'primary' | 'secondary' | 'link'

const VARIANT: Record<Variant, string> = {
  amber: 'btn btn-amber',
  ink: 'btn btn-ink',
  line: 'btn btn-line',
  ghost: 'btn btn-ghost',
  plain: 'btn btn-plain',
  primary: 'btn btn-ink',
  secondary: 'btn btn-line',
  link: 'link',
}

type CommonProps = {
  variant?: Variant
  size?: 'md' | 'sm'
  block?: boolean
  className?: string
  children: ReactNode
}

function classes(variant: Variant, size: 'md' | 'sm', block: boolean, className: string) {
  return [VARIANT[variant], size === 'sm' && variant !== 'link' ? 'btn-sm' : '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes(variant, size, block, className)} {...rest} />
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  block = false,
  external = false,
  className = '',
  children,
  ...rest
}: CommonProps & {
  href: string
  external?: boolean
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const cls = classes(variant, size, block, className)
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  )
}
