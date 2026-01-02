'use client'

import { useState } from 'react'
import { EtsyProductCard } from '@/components/marketplace/EtsyProductCard'
import { MixedGrid, MixedGridAlt, MixedGridDouble } from '@/components/marketplace/MixedGrid'
import { MegaMenu, MegaMenuMobile } from '@/components/marketplace/MegaMenu'
import { RecentlyViewed } from '@/components/marketplace/RecentlyViewed'
import { SearchAutocomplete } from '@/components/marketplace/SearchAutocomplete'
import { Menu } from 'lucide-react'

// Product type matching MixedGrid
interface DemoProduct {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  currency: string
  images: string[]
  rating: number
  reviewCount: number
  seller: { name: string; slug: string }
  badges: ('bestseller' | 'freeShipping' | 'sale' | 'ad')[]
}

// Sample product data
const SAMPLE_PRODUCTS: DemoProduct[] = [
  {
    id: '1',
    name: 'Handcrafted Sterling Silver Crescent Moon Necklace with Moonstone',
    slug: 'moon-necklace',
    price: 89.99,
    originalPrice: 120.00,
    currency: 'AUD',
    images: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    ],
    rating: 4.8,
    reviewCount: 247,
    seller: { name: 'Moonlight Artisan Co', slug: 'moonlight-artisan' },
    badges: ['bestseller', 'freeShipping'],
  },
  {
    id: '2',
    name: 'Gold Vermeil Huggie Earrings - Minimalist Design',
    slug: 'huggie-earrings',
    price: 65.00,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'],
    rating: 4.9,
    reviewCount: 182,
    seller: { name: 'Golden Hour Studio', slug: 'golden-hour' },
    badges: ['freeShipping'],
  },
  {
    id: '3',
    name: 'Aquamarine Cocktail Ring - Vintage Inspired Setting',
    slug: 'aquamarine-ring',
    price: 145.00,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800'],
    rating: 4.7,
    reviewCount: 89,
    seller: { name: 'Vintage Gem Works', slug: 'vintage-gem' },
    badges: ['sale'],
  },
  {
    id: '4',
    name: 'Pearl Drop Bracelet - Freshwater Pearls on Gold Chain',
    slug: 'pearl-bracelet',
    price: 78.00,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'],
    rating: 4.6,
    reviewCount: 156,
    seller: { name: 'Pearl & Stone', slug: 'pearl-stone' },
    badges: [],
  },
  {
    id: '5',
    name: 'Minimalist Bar Pendant - Brushed Sterling Silver',
    slug: 'bar-pendant',
    price: 55.00,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800'],
    rating: 4.8,
    reviewCount: 203,
    seller: { name: 'Simply Silver AU', slug: 'simply-silver' },
    badges: ['bestseller'],
  },
  {
    id: '6',
    name: 'Gemstone Cluster Studs - Rose Gold with Semi-Precious Stones',
    slug: 'cluster-studs',
    price: 95.00,
    originalPrice: 125.00,
    currency: 'AUD',
    images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800'],
    rating: 4.9,
    reviewCount: 312,
    seller: { name: 'Gem & Bloom', slug: 'gem-bloom' },
    badges: ['bestseller', 'sale'],
  },
]

// Sample recently viewed
const RECENTLY_VIEWED = SAMPLE_PRODUCTS.slice(0, 6).map((p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  price: p.price,
  currency: p.currency,
  image: p.images[0],
  viewedAt: Date.now() - Math.random() * 1000000,
}))

export function EtsyComponentsDemo() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-mb-cream">
      {/* Header with Search & Mega Menu */}
      <header className="sticky top-0 z-40 border-b border-mb-sand bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Top row: Logo + Search */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-mb-slate hover:bg-mb-cream"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <span className="text-2xl font-bold text-mb-blue">MadeBuy</span>
            </a>

            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <SearchAutocomplete placeholder="Search for handmade treasures..." />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="rounded-full px-4 py-2 text-sm font-medium text-mb-slate hover:bg-mb-sky">
                Sign in
              </button>
              <button className="rounded-full bg-mb-blue px-4 py-2 text-sm font-medium text-white hover:bg-mb-blue-dark">
                Sell
              </button>
            </div>
          </div>

          {/* Mega Menu - Desktop */}
          <div className="hidden lg:block mt-3 -mx-2">
            <MegaMenu />
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MegaMenuMobile isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-mb-slate">
            MadeBuy Marketplace Components
          </h1>
          <p className="mt-2 text-mb-slate-light">
            Etsy-inspired layouts with MadeBuy brand identity
          </p>
        </div>

        {/* Section: Recently Viewed */}
        <section className="mb-16">
          <RecentlyViewed products={RECENTLY_VIEWED} />
        </section>

        {/* Section: Mixed Grid */}
        <section className="mb-16">
          <MixedGrid
            products={SAMPLE_PRODUCTS}
            title="Editor's Picks"
            subtitle="Handpicked items from our favorite artisans"
            viewAllHref="/marketplace/browse"
            onQuickAdd={(id) => console.log('Quick add:', id)}
            onFavorite={(id) => console.log('Favorite:', id)}
          />
        </section>

        {/* Section: Mixed Grid Alt (hero on right) */}
        <section className="mb-16">
          <MixedGridAlt
            products={[...SAMPLE_PRODUCTS].reverse()}
            title="Trending Now"
            subtitle="What's hot this week"
            viewAllHref="/marketplace/browse?sort=popular"
          />
        </section>

        {/* Section: Product Cards Grid */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-mb-slate">
            Product Card Variants
          </h2>

          <div className="grid gap-8">
            {/* Default Cards */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-mb-slate-light uppercase tracking-wide">
                Default Size (5-6 per row on desktop)
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {SAMPLE_PRODUCTS.map((product) => (
                  <EtsyProductCard
                    key={product.id}
                    product={product}
                    variant="default"
                    onQuickAdd={(id) => console.log('Quick add:', id)}
                    onFavorite={(id) => console.log('Favorite:', id)}
                  />
                ))}
              </div>
            </div>

            {/* Compact Cards */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-mb-slate-light uppercase tracking-wide">
                Compact Size (for denser grids)
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {SAMPLE_PRODUCTS.map((product) => (
                  <EtsyProductCard
                    key={`compact-${product.id}`}
                    product={product}
                    variant="compact"
                  />
                ))}
              </div>
            </div>

            {/* Large Cards */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-mb-slate-light uppercase tracking-wide">
                Large Size (for featured sections)
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {SAMPLE_PRODUCTS.slice(0, 3).map((product) => (
                  <EtsyProductCard
                    key={`large-${product.id}`}
                    product={product}
                    variant="large"
                    onQuickAdd={(id) => console.log('Quick add:', id)}
                    onFavorite={(id) => console.log('Favorite:', id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Double Hero Grid */}
        <section className="mb-16">
          <MixedGridDouble
            products={SAMPLE_PRODUCTS}
            title="Staff Favorites"
            subtitle="Curated collection from our team"
            viewAllHref="/marketplace/browse?collection=staff-favorites"
          />
        </section>

        {/* Color Palette Reference */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-mb-slate">
            MadeBuy Color Palette
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              { name: 'Blue', class: 'bg-mb-blue', hex: '#2563eb' },
              { name: 'Blue Dark', class: 'bg-mb-blue-dark', hex: '#1d4ed8' },
              { name: 'Blue Light', class: 'bg-mb-blue-light', hex: '#3b82f6' },
              { name: 'Navy', class: 'bg-mb-navy', hex: '#1e3a5f' },
              { name: 'Sky', class: 'bg-mb-sky border border-mb-sand', hex: '#e0f2fe' },
              { name: 'Sky Dark', class: 'bg-mb-sky-dark', hex: '#bae6fd' },
              { name: 'Cream', class: 'bg-mb-cream border border-mb-sand', hex: '#f8fafc' },
              { name: 'Slate', class: 'bg-mb-slate', hex: '#475569' },
              { name: 'Slate Light', class: 'bg-mb-slate-light', hex: '#64748b' },
              { name: 'Sand', class: 'bg-mb-sand', hex: '#e2e8f0' },
              { name: 'Accent', class: 'bg-mb-accent', hex: '#10b981' },
              { name: 'Accent Dark', class: 'bg-mb-accent-dark', hex: '#059669' },
            ].map((color) => (
              <div key={color.name} className="text-center">
                <div className={`h-20 rounded-lg ${color.class}`} />
                <p className="mt-2 text-sm font-medium text-mb-slate">{color.name}</p>
                <p className="text-xs text-mb-slate-light">{color.hex}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mb-sand bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-mb-slate-light">
            MadeBuy marketplace components - Etsy-inspired layouts with blue brand identity
          </p>
        </div>
      </footer>
    </div>
  )
}
