import type { Metadata } from 'next'
import './globals.css'
import { WebVitals } from '@/components/analytics/WebVitals'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'

export const metadata: Metadata = {
  title: {
    default: 'MadeBuy - Handmade Marketplace',
    template: '%s | MadeBuy',
  },
  description: 'Discover unique handmade products from talented Australian makers. Zero transaction fees, beautiful storefronts.',
  keywords: ['handmade', 'marketplace', 'Australian makers', 'artisan', 'crafts', 'unique gifts'],
  authors: [{ name: 'MadeBuy' }],
  creator: 'MadeBuy',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: siteUrl,
    siteName: 'MadeBuy',
    title: 'MadeBuy - Handmade Marketplace',
    description: 'Discover unique handmade products from talented Australian makers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MadeBuy - Handmade Marketplace',
    description: 'Discover unique handmade products from talented Australian makers.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  )
}
