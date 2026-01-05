import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Force dynamic rendering to prevent /_not-found prerendering issues
// Next.js 14 tries to statically generate not-found which fails with context errors
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'MadeBuy Admin',
  description: 'Business management platform for makers and crafters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
