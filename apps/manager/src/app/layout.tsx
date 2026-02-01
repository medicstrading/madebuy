import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'MadeBuy Manager',
  description: 'Platform administration dashboard',
}

// Ensure static pages can be generated without client-side context
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
