'use client'

import { Monitor, Tablet, Smartphone } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getGoogleFontsUrl, getTypographyConfig } from '@madebuy/shared/src/constants/typography'
import type { LayoutContent } from '@madebuy/shared'

interface PreviewPanelProps {
  mode: 'colors' | 'banner' | 'typography' | 'layout'
  primaryColor?: string
  accentColor?: string
  typography?: string
  layout?: 'grid' | 'minimal' | 'featured' | 'masonry'
  layoutContent?: LayoutContent
  banner?: {
    mediaUrl?: string
    overlayText?: string
    overlaySubtext?: string
    ctaButton?: { text: string; url: string }
    overlayOpacity?: number
    height?: 'small' | 'medium' | 'large'
  }
}

export function PreviewPanel({
  mode,
  primaryColor = '#2563eb',
  accentColor = '#10b981',
  typography = 'modern',
  layout = 'grid',
  layoutContent = {},
  banner,
}: PreviewPanelProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  }

  // Load typography config and Google Fonts
  const typographyConfig = getTypographyConfig(typography as any)
  const googleFontsUrl = getGoogleFontsUrl(typography as any)

  // Load Google Fonts dynamically when typography changes
  useEffect(() => {
    // Check if font link already exists
    const existingLink = document.querySelector(`link[href="${googleFontsUrl}"]`)
    if (!existingLink) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = googleFontsUrl
      document.head.appendChild(link)
    }
  }, [googleFontsUrl])

  const fonts = {
    heading: typographyConfig.heading.fontFamily,
    body: typographyConfig.body.fontFamily,
  }

  return (
    <div className="sticky top-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Preview Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Preview</h3>

          {/* Device Toggle */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={`rounded p-1.5 transition-colors ${
                device === 'desktop'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Desktop view"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`rounded p-1.5 transition-colors ${
                device === 'tablet'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Tablet view"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`rounded p-1.5 transition-colors ${
                device === 'mobile'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="overflow-auto p-4">
        <div className={`mx-auto ${deviceWidths[device]} transition-all`}>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Mock Storefront */}
            <div className="bg-gray-50">
              {/* Banner Preview (if in banner mode or banner exists) */}
              {(mode === 'banner' || banner?.mediaUrl) && banner && (
                <div className="relative h-48 overflow-hidden bg-gray-200">
                  {banner.mediaUrl && (
                    banner.mediaUrl.startsWith('linear-gradient') ? (
                      <div
                        className="absolute inset-0"
                        style={{ background: banner.mediaUrl }}
                      />
                    ) : (
                      <Image
                        src={banner.mediaUrl}
                        alt="Banner"
                        fill
                        className="object-cover"
                      />
                    )
                  )}
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: (banner.overlayOpacity || 40) / 100 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <div className="text-center text-white">
                      {banner.overlayText && (
                        <h1 className="mb-2 text-2xl font-bold" style={{ fontFamily: fonts.heading }}>
                          {banner.overlayText}
                        </h1>
                      )}
                      {banner.overlaySubtext && (
                        <p className="mb-4 text-sm" style={{ fontFamily: fonts.body }}>
                          {banner.overlaySubtext}
                        </p>
                      )}
                      {banner.ctaButton?.text && (
                        <button
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {banner.ctaButton.text}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="border-b border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: fonts.heading }}>
                    Your Store
                  </h2>
                  <button
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Cart
                  </button>
                </div>
              </div>

              {/* Page Sections */}
              <div className="space-y-0">
                {/* Classic Store Layout */}
                {layout === 'grid' && (
                  <>
                    {/* Hero Section */}
                    <div className="border-b-2 border-gray-300 bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          Section 1: Hero
                        </span>
                      </div>
                      <div className="text-center">
                        <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: fonts.heading }}>
                          Hero Banner
                        </h2>
                        <p className="mt-1 text-xs text-gray-600">Welcome message</p>
                      </div>
                    </div>

                    {/* Categories Section */}
                    <div className="border-b-2 border-gray-300 bg-white p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Section 1: Categories
                        </span>
                      </div>
                      <p className="mb-2 text-xs font-semibold text-gray-700">
                        {layoutContent.categorySectionTitle || 'Shop by Category'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {['Jewelry', 'Crafts', 'Art'].map((cat) => (
                          <div key={cat} className="rounded bg-gray-100 p-2 text-center">
                            <p className="text-xs text-gray-700">{cat}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Section 2: Products
                        </span>
                      </div>
                      <p className="mb-2 text-xs font-semibold text-gray-700">
                        {layoutContent.productsSectionTitle || 'All Products'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="rounded bg-white p-2">
                            <div className="mb-1 aspect-square rounded bg-gray-200" />
                            <p className="text-xs text-gray-900">Product {i}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Minimal Showcase Layout */}
                {layout === 'minimal' && (
                  <>
                    {/* Large Hero */}
                    <div className="border-b-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Top Section: Hero
                        </span>
                      </div>
                      <div className="text-center">
                        <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: fonts.heading }}>
                          {layoutContent.minimalHeroHeadline || 'Your Brand'}
                        </h2>
                        <p className="mt-1 text-xs text-gray-600">Brand story & values</p>
                      </div>
                    </div>

                    {/* Featured Products */}
                    <div className="space-y-4 bg-white p-4">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Bottom Section: Featured
                        </span>
                      </div>
                      <p className="text-center text-xs font-semibold text-gray-700">
                        {layoutContent.featuredCollectionTitle || 'Featured Collection'}
                      </p>
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="mb-2 aspect-video rounded bg-gray-100" />
                          <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: fonts.heading }}>
                            Product {i}
                          </h3>
                          <button className="mt-2 rounded bg-gray-900 px-3 py-1 text-xs text-white">
                            {layoutContent.viewDetailsButtonText || 'View Details'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Featured Focus Layout */}
                {layout === 'featured' && (
                  <>
                    {/* Featured Collection Banner */}
                    <div className="border-b-2 border-gray-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Section 1: Featured Banner
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {layoutContent.collectionBadgeText || 'New Collection'}
                        </div>
                        <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: fonts.heading }}>
                          {layoutContent.collectionBannerTitle || 'Featured Collection'}
                        </h2>
                        {layoutContent.collectionBannerDescription && (
                          <p className="mt-1 text-xs text-gray-600" style={{ fontFamily: fonts.body }}>
                            {layoutContent.collectionBannerDescription.slice(0, 60)}...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* About/Story Section */}
                    <div className="border-b-2 border-gray-300 bg-white p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Section 2: Brand Story
                        </span>
                      </div>
                      <p className="mb-1 text-xs font-semibold text-gray-700">
                        {layoutContent.ourStoryTitle || 'Our Story'}
                      </p>
                      <div className="rounded bg-gray-50 p-2">
                        <p className="text-xs text-gray-600" style={{ fontFamily: fonts.body }}>
                          {layoutContent.ourStoryContent || 'Handcrafted with love and tradition...'}
                        </p>
                      </div>
                    </div>

                    {/* Highlighted Products */}
                    <div className="bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Section 3: Signature Items
                        </span>
                      </div>
                      <p className="mb-1 text-xs font-semibold text-gray-700">
                        {layoutContent.signaturePiecesTitle || 'Signature Pieces'}
                      </p>
                      {layoutContent.signaturePiecesSubtitle && (
                        <p className="mb-2 text-xs text-gray-500">
                          {layoutContent.signaturePiecesSubtitle}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="rounded bg-white p-2">
                            <div className="mb-1 aspect-square rounded bg-gradient-to-br from-amber-100 to-orange-100" />
                            <p className="text-xs font-semibold text-gray-900">Product {i}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Magazine Style Layout */}
                {layout === 'masonry' && (
                  <>
                    {/* Editorial Hero */}
                    <div className="border-b-2 border-gray-300 bg-gradient-to-br from-purple-50 to-pink-50 p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Section 1: Editorial Hero
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 rounded bg-purple-100 p-2">
                          <div className="mb-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {layoutContent.latestBadgeText || 'Latest'}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-gray-900" style={{ fontFamily: fonts.heading }}>
                            {layoutContent.magazineHeroHeadline || 'Featured Article'}
                          </p>
                        </div>
                        <div className="w-16 rounded bg-pink-100" />
                      </div>
                    </div>

                    {/* Mixed Content Blocks */}
                    <div className="border-b-2 border-gray-300 bg-white p-3">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Section 2: Mixed Content
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Tall image block */}
                        <div className="row-span-2 rounded bg-gradient-to-br from-purple-100 to-purple-200 p-2">
                          <p className="text-xs font-semibold text-gray-900" style={{ fontFamily: fonts.heading }}>
                            {layoutContent.magazineHeroHeadline?.slice(0, 20) || 'Featured Article'}
                          </p>
                          <button className="mt-2 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white">
                            {layoutContent.discoverMoreButtonText || 'Discover More'}
                          </button>
                        </div>

                        {/* Product blocks */}
                        <div className="rounded bg-gray-100 p-2">
                          <div className="aspect-square rounded bg-gray-200" />
                        </div>
                        <div className="rounded bg-gray-100 p-2">
                          <div className="aspect-square rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>

                    {/* Visual Grid */}
                    <div className="bg-gray-50 p-2">
                      <div className="mb-2 flex items-center justify-center">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Section 3: Product Grid
                        </span>
                      </div>
                      <p className="mb-2 text-center text-xs font-semibold text-gray-900" style={{ fontFamily: fonts.heading }}>
                        {layoutContent.moreCollectionTitle || 'More From Our Collection'}
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="aspect-square rounded bg-gray-200" />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Typography Preview (when in typography mode) */}
              {mode === 'typography' && (
                <div className="border-t bg-white p-4">
                  <h2
                    className="mb-2 text-xl font-bold text-gray-900"
                    style={{ fontFamily: fonts.heading }}
                  >
                    Heading Example
                  </h2>
                  <p
                    className="text-sm text-gray-700"
                    style={{ fontFamily: fonts.body }}
                  >
                    This is how your body text will appear across your storefront. All product
                    descriptions, about pages, and general content will use this font.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Device Info */}
          <div className="mt-2 text-center text-xs text-gray-500">
            {device === 'desktop' && 'Desktop View'}
            {device === 'tablet' && 'Tablet View (768px)'}
            {device === 'mobile' && 'Mobile View (375px)'}
          </div>
        </div>
      </div>
    </div>
  )
}
