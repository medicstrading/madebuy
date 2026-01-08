import { requireTenant } from '@/lib/tenant'
import { pieces } from '@madebuy/db'
import { populatePiecesWithMedia } from '@/lib/pieces'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import { WishlistContent } from '@/components/wishlist/WishlistContent'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  return {
    title: `Wishlist - ${tenant.businessName}`,
  }
}

export default async function WishlistPage({ params }: { params: { tenant: string } }) {
  const tenant = await requireTenant(params.tenant)

  // Get all pieces so we can display wishlist items
  // The actual wishlist filtering happens client-side via the API
  const rawPieces = await pieces.listPieces(tenant.id, { status: 'available' })
  const allPieces = await populatePiecesWithMedia(rawPieces)

  return (
    <div className="min-h-screen bg-white tenant-theme">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/${params.tenant}`}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <div className="flex items-center gap-2 text-gray-900">
              <Heart className="h-5 w-5" />
              <span className="font-medium">Wishlist</span>
            </div>
            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Wishlist Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Wishlist</h1>
        <WishlistContent
          tenant={params.tenant}
          tenantId={tenant.id}
          allPieces={allPieces}
        />
      </main>
    </div>
  )
}
