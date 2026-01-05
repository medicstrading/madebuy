import { notFound } from 'next/navigation'
import { previews } from '@madebuy/db'
import type { ExtractedDesign, NavItem } from '@madebuy/shared'
import { TYPOGRAPHY_PRESETS } from '@madebuy/shared'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Menu, ChevronRight, Star, Mail } from 'lucide-react'

interface PreviewPageProps {
  params: { previewId: string }
}

export async function generateMetadata({ params }: PreviewPageProps) {
  return {
    title: 'Design Preview - MadeBuy',
    robots: 'noindex, nofollow',
  }
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const preview = await previews.getPreviewById(params.previewId)

  if (!preview) {
    notFound()
  }

  const { extractedDesign, sourceUrl } = preview

  // Get colors with fallbacks
  const primaryColor = extractedDesign.colors.primary || '#2563eb'
  const accentColor = extractedDesign.colors.accent || '#10b981'

  // Get typography preset
  const typographyPreset = extractedDesign.typography.matchedPreset || 'modern'
  const typography = TYPOGRAPHY_PRESETS[typographyPreset]

  // Get navigation items
  const navItems = extractedDesign.navigation.items.slice(0, 6)

  // Get detected sections for layout hints
  const detectedSections = extractedDesign.sections

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        '--primary-color': primaryColor,
        '--accent-color': accentColor,
        fontFamily: typography?.body?.fontFamily || 'system-ui, sans-serif',
      } as React.CSSProperties}
    >
      {/* Preview Banner */}
      <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center text-sm">
        <span className="text-yellow-800">
          <strong>Preview Mode</strong> — This is how your imported design will look.
          Imported from: <span className="font-mono text-xs">{sourceUrl}</span>
        </span>
      </div>

      {/* Header */}
      <PreviewHeader
        design={extractedDesign}
        primaryColor={primaryColor}
        navItems={navItems}
        typography={typography}
      />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <PreviewHero
          design={extractedDesign}
          primaryColor={primaryColor}
          typography={typography}
        />

        {/* Features/Info Section */}
        {detectedSections.some(s => s.type === 'features') && (
          <PreviewFeatures primaryColor={primaryColor} />
        )}

        {/* Product Grid */}
        <PreviewProducts
          primaryColor={primaryColor}
          accentColor={accentColor}
          typography={typography}
        />

        {/* Testimonials */}
        {detectedSections.some(s => s.type === 'testimonials') && (
          <PreviewTestimonials primaryColor={primaryColor} />
        )}

        {/* CTA Section */}
        <PreviewCTA primaryColor={primaryColor} />
      </main>

      {/* Footer */}
      <PreviewFooter
        design={extractedDesign}
        primaryColor={primaryColor}
        navItems={navItems}
      />

      {/* Design Info Panel */}
      <DesignInfoPanel design={extractedDesign} />
    </div>
  )
}

// ============================================================================
// Preview Components
// ============================================================================

function PreviewHeader({
  design,
  primaryColor,
  navItems,
  typography,
}: {
  design: ExtractedDesign
  primaryColor: string
  navItems: NavItem[]
  typography: typeof TYPOGRAPHY_PRESETS[keyof typeof TYPOGRAPHY_PRESETS] | undefined
}) {
  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {design.logo?.sourceUrl ? (
              <div className="h-10 w-auto relative">
                <img
                  src={design.logo.sourceUrl}
                  alt="Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
            ) : (
              <div
                className="text-xl font-bold"
                style={{
                  color: primaryColor,
                  fontFamily: typography?.heading?.fontFamily,
                }}
              >
                Your Brand
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.length > 0 ? (
              navItems.map((item, i) => (
                <span
                  key={i}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 cursor-default"
                >
                  {item.label}
                </span>
              ))
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">Home</span>
                <span className="text-sm font-medium text-gray-700">Shop</span>
                <span className="text-sm font-medium text-gray-700">About</span>
                <span className="text-sm font-medium text-gray-700">Contact</span>
              </>
            )}
          </nav>

          {/* Cart */}
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              style={{ color: primaryColor }}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function PreviewHero({
  design,
  primaryColor,
  typography,
}: {
  design: ExtractedDesign
  primaryColor: string
  typography: typeof TYPOGRAPHY_PRESETS[keyof typeof TYPOGRAPHY_PRESETS] | undefined
}) {
  return (
    <section className="relative bg-gradient-to-br from-gray-50 to-gray-100 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{
              fontFamily: typography?.heading?.fontFamily,
              color: '#1f2937',
            }}
          >
            Handmade with Love
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            Discover unique, handcrafted products made with passion and care.
            Each piece tells a story.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              className="px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Shop Now
            </button>
            <button className="px-6 py-3 rounded-lg border border-gray-300 font-medium hover:bg-gray-50">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewFeatures({ primaryColor }: { primaryColor: string }) {
  const features = [
    { title: 'Handcrafted', desc: 'Made with care and attention to detail' },
    { title: 'Unique Designs', desc: 'One-of-a-kind pieces you won\'t find elsewhere' },
    { title: 'Fast Shipping', desc: 'Quick and secure delivery to your door' },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="text-center">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <ChevronRight className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PreviewProducts({
  primaryColor,
  accentColor,
  typography,
}: {
  primaryColor: string
  accentColor: string
  typography: typeof TYPOGRAPHY_PRESETS[keyof typeof TYPOGRAPHY_PRESETS] | undefined
}) {
  // Placeholder products
  const products = [
    { name: 'Handwoven Basket', price: 65 },
    { name: 'Ceramic Vase', price: 89 },
    { name: 'Wooden Bowl Set', price: 120 },
    { name: 'Linen Tote Bag', price: 45 },
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className="text-3xl font-bold text-center mb-12"
          style={{ fontFamily: typography?.heading?.fontFamily }}
        >
          Featured Products
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Product Image</span>
              </div>
              <div className="p-4">
                <h3 className="font-medium mb-1">{product.name}</h3>
                <p style={{ color: primaryColor }} className="font-semibold">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button
            className="px-6 py-3 rounded-lg font-medium"
            style={{
              backgroundColor: primaryColor,
              color: 'white',
            }}
          >
            View All Products
          </button>
        </div>
      </div>
    </section>
  )
}

function PreviewTestimonials({ primaryColor }: { primaryColor: string }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">What Customers Say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                &ldquo;Beautiful craftsmanship and excellent quality. I&apos;ll definitely be ordering again!&rdquo;
              </p>
              <p className="font-medium">— Happy Customer</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PreviewCTA({ primaryColor }: { primaryColor: string }) {
  return (
    <section
      className="py-16"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Join Our Newsletter
        </h2>
        <p className="text-white/80 mb-6 max-w-lg mx-auto">
          Subscribe for updates on new products, exclusive offers, and behind-the-scenes content.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg"
          />
          <button className="px-6 py-3 bg-white rounded-lg font-medium hover:bg-gray-100">
            Subscribe
          </button>
        </div>
      </div>
    </section>
  )
}

function PreviewFooter({
  design,
  primaryColor,
  navItems,
}: {
  design: ExtractedDesign
  primaryColor: string
  navItems: NavItem[]
}) {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
              Your Brand
            </div>
            <p className="text-gray-400 text-sm">
              Handmade products crafted with love and care.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              {navItems.length > 0 ? (
                navItems.slice(0, 4).map((item, i) => (
                  <li key={i}>{item.label}</li>
                ))
              ) : (
                <>
                  <li>Home</li>
                  <li>Shop</li>
                  <li>About</li>
                  <li>Contact</li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Help</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Shipping</li>
              <li>Returns</li>
              <li>FAQ</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" /> hello@example.com
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} Your Brand. Powered by MadeBuy.
        </div>
      </div>
    </footer>
  )
}

function DesignInfoPanel({ design }: { design: ExtractedDesign }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border p-4 max-w-xs text-sm z-50">
      <h4 className="font-semibold mb-3">Extracted Design</h4>

      <div className="space-y-3">
        {/* Colors */}
        <div>
          <div className="text-gray-500 text-xs mb-1">Colors</div>
          <div className="flex gap-2">
            {design.colors.primary && (
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: design.colors.primary }}
                />
                <span className="text-xs font-mono">{design.colors.primary}</span>
              </div>
            )}
            {design.colors.accent && (
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: design.colors.accent }}
                />
                <span className="text-xs font-mono">{design.colors.accent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Typography */}
        <div>
          <div className="text-gray-500 text-xs mb-1">Typography</div>
          <div className="text-xs">
            Preset: <span className="font-medium capitalize">{design.typography.matchedPreset}</span>
          </div>
          {design.typography.detectedFonts.length > 0 && (
            <div className="text-xs text-gray-600">
              Fonts: {design.typography.detectedFonts.join(', ')}
            </div>
          )}
        </div>

        {/* Sections */}
        <div>
          <div className="text-gray-500 text-xs mb-1">Detected Sections</div>
          <div className="flex flex-wrap gap-1">
            {design.sections.map((s, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-gray-100 rounded text-xs capitalize"
              >
                {s.type}
              </span>
            ))}
            {design.sections.length === 0 && (
              <span className="text-gray-400 text-xs">None detected</span>
            )}
          </div>
        </div>

        {/* Template */}
        <div>
          <div className="text-gray-500 text-xs mb-1">Recommended Template</div>
          <div className="text-xs">
            <span className="font-medium capitalize">{design.templateMatch.recommended.replace('-', ' ')}</span>
            <span className="text-gray-500 ml-1">
              ({Math.round(design.templateMatch.confidence * 100)}% confidence)
            </span>
          </div>
        </div>

        {/* Limitations */}
        {design.limitations.length > 0 && (
          <div>
            <div className="text-yellow-600 text-xs mb-1">⚠️ Limitations</div>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {design.limitations.slice(0, 3).map((l, i) => (
                <li key={i}>• {l}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
