import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart } from 'lucide-react'
import type { ProductWithSeller } from '@madebuy/shared'

interface ProductCardProps {
  product: Partial<ProductWithSeller>
  showSeller?: boolean
}

export function ProductCard({ product, showSeller = true }: ProductCardProps) {
  const {
    id,
    name,
    slug,
    description,
    price,
    currency = 'AUD',
    marketplace,
    seller,
  } = product

  const avgRating = marketplace?.avgRating || 0
  const totalReviews = marketplace?.totalReviews || 0

  // Add utm_source for marketplace attribution
  const productUrl = `/marketplace/product/${id || slug}?utm_source=marketplace`

  return (
    <Link
      href={productUrl}
      className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {/* TODO: Replace with actual product image */}
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
          <span className="text-sm text-gray-400">Product Image</span>
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            // TODO: Add to favorites
          }}
          className="absolute right-2 top-2 rounded-full bg-white p-2 shadow-md hover:bg-gray-50"
        >
          <Heart className="h-4 w-4 text-gray-600" />
        </button>

        {/* Featured badge */}
        {marketplace?.featuredUntil && new Date(marketplace.featuredUntil) > new Date() && (
          <div className="absolute left-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-xs font-semibold text-gray-900">
            Featured
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="mb-1 font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600">
          {name || 'Product Name'}
        </h3>

        {description && (
          <p className="mb-2 text-sm text-gray-600 line-clamp-2">{description}</p>
        )}

        {/* Price and Rating */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ${price ? price.toFixed(2) : '0.00'}
          </span>

          {totalReviews > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{avgRating.toFixed(1)}</span>
              <span className="text-gray-400">({totalReviews})</span>
            </div>
          )}
        </div>

        {/* Seller */}
        {showSeller && seller && (
          <div className="flex items-center gap-2 border-t pt-3">
            <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-200 to-purple-200"></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-gray-600">{seller.displayName}</p>
            </div>
            {seller.badges?.includes('top_seller') && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Top
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
