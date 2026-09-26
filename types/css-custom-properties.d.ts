import 'react'

// Lets style={{ '--i': 3 }} type-check: the one inline style the design system
// allows (custom properties only — see scripts/check-styles.mts).
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
