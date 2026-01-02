import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon, Star, Mail, Phone, MapPin, ArrowRight } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'
import { ProductCard, RecentlyViewed } from '@/components/storefront/ProductCard'
import { mapPieceToProduct } from '@/lib/productMapping'

interface ClassicStoreLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Classic Store Layout - Modern Clean Version
 * Store stats → About section → Products with category tabs → Reviews → Contact form
 */
export function ClassicStoreLayout({ pieces, tenantSlug, tenant }: ClassicStoreLayoutProps) {
  // Group products by category for category tabs
  const categories = Array.from(new Set(pieces.map((p) => p.category).filter(Boolean)))

  // Get layout content from tenant design
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-16">
      {/* About Section */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {layoutContent.aboutTitle || 'About Our Store'}
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            {layoutContent.aboutDescription || tenant.description || 'Welcome to our store. We create unique handmade products with passion and care.'}
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-3">
            {['Handmade', 'Australian Made', 'Free Shipping', 'Gift Wrapping'].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
          {layoutContent.aboutImage ? (
            <Image
              src={layoutContent.aboutImage}
              alt="About our store"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-400">Store image</p>
            </div>
          )}
        </div>
      </section>

      {/* Products Section with Category Tabs */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {layoutContent.productsSectionTitle || 'Our Products'}
            </h2>
            <p className="mt-1 text-gray-500">Browse our collection of handmade items</p>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button className="flex-shrink-0 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white">
                All
              </button>
              {categories.slice(0, 5).map((category) => (
                <button
                  key={category}
                  className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all"
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {pieces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {pieces.map((piece) => (
              <ProductCard
                key={piece.id}
                product={mapPieceToProduct(piece, tenantSlug, tenant.businessName)}
                variant="default"
              />
            ))}
          </div>
        )}
      </section>

      {/* Reviews Section */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <p className="mt-1 text-gray-500">See what our customers are saying</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-gray-900">4.9</span>
            <span className="text-gray-500">(120 reviews)</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Sarah M.', rating: 5, text: 'Absolutely beautiful craftsmanship! The attention to detail is incredible.' },
            { name: 'James K.', rating: 5, text: 'Fast shipping and the product exceeded my expectations. Will buy again!' },
            { name: 'Emily R.', rating: 4, text: 'Lovely quality and great customer service. Highly recommend this store.' },
          ].map((review, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-gray-600 mb-4">&ldquo;{review.text}&rdquo;</p>
              <p className="text-sm font-medium text-gray-900">{review.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="rounded-2xl bg-gray-50 p-8 lg:p-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-500 mb-8">
              Have a question or custom order request? We&apos;d love to hear from you.
            </p>

            <div className="space-y-4">
              {tenant.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <span>{tenant.email}</span>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <span>{tenant.phone}</span>
                </div>
              )}
              {tenant.location && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <span>{tenant.location}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your name"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none transition-colors"
                />
                <input
                  type="email"
                  placeholder="Your email"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none transition-colors"
                />
              </div>
              <textarea
                placeholder="Your message"
                rows={4}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none transition-colors resize-none"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Send Message
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <section className="border-t border-gray-100 pt-12">
        <RecentlyViewed />
      </section>
    </div>
  )
}
