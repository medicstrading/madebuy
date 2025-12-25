import { requireTenant } from '@/lib/tenant'
import { pieces } from '@madebuy/db'
import { populatePiecesWithMedia } from '@/lib/pieces'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.businessName}</h1>
              {tenant.description && (
                <p className="mt-1 text-gray-600">{tenant.description}</p>
              )}
            </div>
            <Link
              href={`/${params.tenant}/cart`}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <ShoppingCart className="h-5 w-5" />
              Cart
            </Link>
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-8">
        {allPieces.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allPieces.map((piece) => (
              <Link
                key={piece.id}
                href={`/${params.tenant}/${piece.slug}`}
                className="group overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-105"
              >
                {/* Image */}
                {piece.mediaIds.length > 0 && piece.primaryImage ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <Image
                      src={piece.primaryImage.variants.thumb?.url || piece.primaryImage.variants.original.url}
                      alt={piece.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-gray-100">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{piece.name}</h3>
                  {piece.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{piece.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(piece.price, piece.currency)}
                    </span>
                    {piece.stock !== undefined && piece.stock > 0 && (
                      <span className="text-sm text-green-600">In Stock</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
