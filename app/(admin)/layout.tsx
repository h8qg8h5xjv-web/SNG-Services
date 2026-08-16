import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], weight: ['400', '600'] })

export const metadata: Metadata = {
  title: 'Admin · SNG Services',
  robots: { index: false, follow: false },
}

// Separate root layout for the admin area — no i18n, not indexed.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-slate-900">{children}</body>
    </html>
  )
}
