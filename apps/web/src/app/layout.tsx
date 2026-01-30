import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Dynamically import WebVitals with SSR disabled to prevent context issues during static generation
const WebVitals = dynamic(
  () => import('@/components/analytics/WebVitals').then((mod) => mod.WebVitals),
  { ssr: false }
)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://madebuy.com.au'

export const metadata: Metadata = {
  title: {
    default: 'MadeBuy - Handmade Marketplace',
    template: '%s | MadeBuy',
  },
  description:
    'Discover unique handmade products from talented Australian makers. Zero transaction fees, beautiful storefronts.',
  keywords: [
    'handmade',
    'marketplace',
    'Australian makers',
    'artisan',
    'crafts',
    'unique gifts',
  ],
  authors: [{ name: 'MadeBuy' }],
  creator: 'MadeBuy',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: siteUrl,
    siteName: 'MadeBuy',
    title: 'MadeBuy - Handmade Marketplace',
    description:
      'Discover unique handmade products from talented Australian makers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MadeBuy - Handmade Marketplace',
    description:
      'Discover unique handmade products from talented Australian makers.',
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
      <body className={`${inter.variable} font-sans`}>
        <WebVitals />
        {children}
      </body>
    </html>
  )
}
