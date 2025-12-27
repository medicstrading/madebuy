import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'
import type { PieceWithMedia } from '@/lib/pieces'
import type { Tenant } from '@madebuy/shared'

interface ClassicStoreLayoutProps {
  pieces: PieceWithMedia[]
  tenantSlug: string
  tenant: Tenant
}

/**
 * Classic Store Layout
 * Traditional e-commerce layout: Hero → Categories → Products Grid
 */
export function ClassicStoreLayout({ pieces, tenantSlug, tenant }: ClassicStoreLayoutProps) {
  // Group products by category for category section
  const categories = Array.from(new Set(pieces.map((p) => p.category).filter(Boolean)))

  // Get layout content from tenant design
  const layoutContent = tenant.websiteDesign?.layoutContent || {}

  return (
    <div className="space-y-8">
      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className={`mb-4 text-xl font-bold ${!layoutContent.categorySectionTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
            {layoutContent.categorySectionTitle || '[Add category section title]'}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <div
                key={category}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center transition-colors hover:bg-gray-100"
              >
                <p className="font-medium text-gray-900">{category}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {pieces.filter((p) => p.category === category).length} items
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Products Grid */}
      <section>
        <h2 className={`mb-6 text-2xl font-bold ${!layoutContent.productsSectionTitle ? 'italic text-gray-600' : 'text-gray-900'}`}>
          {layoutContent.productsSectionTitle || '[Add products section title]'}
        </h2>
        {pieces.length === 0 ? (
          <div className="rounded-lg bg-white py-12 text-center shadow-sm">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pieces.map((piece) => (
              <Link
                key={piece.id}
                href={`/${tenantSlug}/${piece.slug}`}
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
      </section>
    </div>
  )
}
