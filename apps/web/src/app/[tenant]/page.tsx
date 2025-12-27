import { requireTenant } from '@/lib/tenant'
import { pieces, media } from '@madebuy/db'
import { populatePiecesWithMedia } from '@/lib/pieces'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className="relative h-12 w-auto">
                  <Image
                    src={logoUrl}
                    alt={tenant.businessName}
                    width={150}
                    height={48}
                    className="h-full w-auto object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900">{tenant.businessName}</h1>
                {tenant.description && (
                  <p className="text-sm text-gray-600">{tenant.description}</p>
                )}
              </div>
            </div>
            <Link
              href={`/${params.tenant}/cart`}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" />
              Cart
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {tenant.websiteDesign?.banner && (
        <HeroBanner banner={tenant.websiteDesign.banner} tenantSlug={params.tenant} />
      )}

      {/* Main Content - Dynamic Layout */}
      <main className="container mx-auto px-4 py-8">
        <LayoutComponent pieces={allPieces} tenantSlug={params.tenant} tenant={tenant} />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} {tenant.businessName}. All rights reserved.</p>
          <p className="mt-1">
            Powered by{' '}
            <a href="https://madebuy.com.au" className="text-blue-600 hover:underline">
              MadeBuy
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
