import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

// DESIGN-SYSTEM §5: three button kinds, height 44px, rounded-lg. Text comes from
// the caller (translations), never hardcoded here.
type Variant = 'primary' | 'secondary' | 'link'

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-body font-semibold transition-colors'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white',
  secondary: 'border border-slate-200 text-slate-900',
  link: 'min-h-0 px-0 text-teal-700',
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
