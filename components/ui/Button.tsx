import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

// DESIGN-SYSTEM §5: pill buttons. Primary = blue-950 fill; secondary = white with
// a 1.5px slate-900 border; link = accent, no pill. Height 48px. Text from the
// caller (translations). The accent is no longer used on buttons (§2).
type Variant = 'primary' | 'secondary' | 'link'

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold transition-colors'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-blue-950 text-white',
  secondary: 'border-medium border-slate-900 bg-white text-slate-900',
  link: 'min-h-0 rounded-none px-0 text-accent',
}

type CommonProps = { variant?: Variant; className?: string; children: ReactNode }

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest} />
  )
}

// Same look, rendered as a link. Internal hrefs go through the i18n Link;
// absolute URLs (a provider's website) render as a plain external anchor.
export function ButtonLink({
  href,
  variant = 'primary',
  external = false,
  className = '',
  children,
  ...rest
}: CommonProps & {
  href: string
  external?: boolean
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = `${BASE} ${VARIANT[variant]} ${className}`
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  )
}
