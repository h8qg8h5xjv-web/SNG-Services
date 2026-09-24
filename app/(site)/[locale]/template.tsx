import type { ReactNode } from 'react'
import { ViewTransition } from 'react'

// A template remounts on every navigation, so this boundary "enters" each time
// and React runs the navigation inside a view transition. The boundary itself
// animates nothing: the page transition is the root snapshot, styled per
// navigation kind in app/styles/transitions.css.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="none" exit="none" update="none" default="none">
      {children}
    </ViewTransition>
  )
}
