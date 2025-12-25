import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MadeBuy - Handmade Marketplace',
  description: 'Discover unique handmade products from talented makers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
