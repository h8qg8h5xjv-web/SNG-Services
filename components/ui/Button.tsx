import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

// DESIGN-SYSTEM §1/§Отклик: flat buttons, 10px radius (no pills). Primary = dark
// ink fill; secondary = white with a slate border; link = accent text. 44px tall.
// Press dips to 0.97; keyboard focus shows an accent ring; hover darkens.
type Variant = 'primary' | 'secondary' | 'link'

const BASE =
  'press focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-body font-semibold transition-colors'
const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-blue-900',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  link: 'min-h-0 rounded-none px-0 text-accent hover:underline',
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
