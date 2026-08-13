import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Admin · SNG Services',
  robots: { index: false, follow: false },
}

// Separate root layout for the admin area — no i18n, not indexed.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  )
}
