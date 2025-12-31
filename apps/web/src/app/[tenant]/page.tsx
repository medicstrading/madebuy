import { requireTenant } from '@/lib/tenant'
import { pieces, media } from '@madebuy/db'
import { populatePiecesWithMedia } from '@/lib/pieces'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, MapPin, Star, ArrowLeft } from 'lucide-react'
import { HeroBanner } from '@/components/storefront/HeroBanner'
import { ClassicStoreLayout } from '@/components/storefront/layouts/ClassicStoreLayout'
import { MinimalShowcaseLayout } from '@/components/storefront/layouts/MinimalShowcaseLayout'
import { FeaturedFocusLayout } from '@/components/storefront/layouts/FeaturedFocusLayout'
import { MagazineStyleLayout } from '@/components/storefront/layouts/MagazineStyleLayout'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `${tenant.businessName} - Handmade Products`,
    description: tenant.description || `Shop handmade products from ${tenant.businessName}`,
  }
}

export default async function ShopHomePage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)
  const rawPieces = await pieces.listPieces(tenant.id, { status: 'available' })
  const allPieces = await populatePiecesWithMedia(rawPieces)

  // Get layout from tenant config, default to 'grid' (Classic Store)
  const layout = tenant.websiteDesign?.layout || 'grid'

  // Fetch logo if exists
  let logoUrl: string | null = null
  if (tenant.logoMediaId) {
    const logoMedia = await media.getMedia(tenant.id, tenant.logoMediaId)
    logoUrl = logoMedia?.variants.original.url || null
  }

  // Render appropriate layout component
  const LayoutComponent =
    layout === 'minimal'
      ? MinimalShowcaseLayout
      : layout === 'featured'
      ? FeaturedFocusLayout
      : layout === 'masonry'
      ? MagazineStyleLayout
      : ClassicStoreLayout

  return (
    <div className="min-h-screen bg-white tenant-theme">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Back to Marketplace */}
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            {/* Store Name & Logo */}
            <Link href={`/${params.tenant}`} className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-lg">
                  <Image
                    src={logoUrl}
                    alt={tenant.businessName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                  <span className="text-lg font-bold text-white">
                    {tenant.businessName.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-lg font-semibold text-gray-900">{tenant.businessName}</span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {tenant.websiteDesign?.blog?.enabled && (
                <Link
                  href={`/${params.tenant}/blog`}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
                >
                  {tenant.websiteDesign.blog.title || 'Blog'}
                </Link>
              )}
              <Link
                href={`/${params.tenant}/cart`}
                className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {tenant.websiteDesign?.banner && (
        <HeroBanner banner={tenant.websiteDesign.banner} tenantSlug={params.tenant} logoUrl={logoUrl} tenant={tenant} />
      )}

      {/* Store Stats Bar (for Classic layout) */}
      {layout === 'grid' && (
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-gray-900">4.9</span>
                <span>(120 reviews)</span>
              </div>
              <div className="h-4 w-px bg-gray-300 hidden sm:block" />
              <div className="text-gray-600">
                <span className="font-medium text-gray-900">{allPieces.length}</span> Products
              </div>
              {tenant.location && (
                <>
                  <div className="h-4 w-px bg-gray-300 hidden sm:block" />
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {tenant.location}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Dynamic Layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <LayoutComponent pieces={allPieces} tenantSlug={params.tenant} tenant={tenant} />
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Store Info */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                  <Image
                    src={logoUrl}
                    alt={tenant.businessName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                  <span className="text-lg font-bold text-white">
                    {tenant.businessName.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-lg font-semibold text-gray-900">{tenant.businessName}</span>
            </div>

            {tenant.description && (
              <p className="text-sm text-gray-500 max-w-md">{tenant.description}</p>
            )}

            {/* Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link href={`/${params.tenant}`} className="text-gray-500 hover:text-gray-900 transition-colors">
                Shop
              </Link>
              <Link href={`/${params.tenant}/contact`} className="text-gray-500 hover:text-gray-900 transition-colors">
                Contact
              </Link>
              {tenant.websiteDesign?.blog?.enabled && (
                <Link href={`/${params.tenant}/blog`} className="text-gray-500 hover:text-gray-900 transition-colors">
                  Blog
                </Link>
              )}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {tenant.businessName}. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Powered by{' '}
              <Link href="https://madebuy.com.au" className="text-gray-500 hover:text-gray-700 transition-colors">
                MadeBuy
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
