import type { PieceWithMedia } from '@/lib/pieces'

/**
 * Product data structure for EtsyProductCard component
 */
export interface CardProduct {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  currency: 'AUD' | 'USD' | 'EUR' | 'GBP'
  images: string[]
  rating: number
  reviewCount: number
  seller: {
    name: string
    slug?: string
  }
  badges: ('freeShipping' | 'bestseller' | 'sale' | 'ad')[]
  href?: string
}

/**
 * Maps a PieceWithMedia (storefront product) to CardProduct format for EtsyProductCard
 *
 * @param piece - The piece/product from the database
 * @param tenantSlug - The tenant's URL slug
 * @param tenantName - Optional tenant business name
 * @returns CardProduct formatted for EtsyProductCard component
 */
export function mapPieceToProduct(
  piece: PieceWithMedia,
  tenantSlug: string,
  tenantName?: string,
): CardProduct {
  return {
    id: piece.id,
    name: piece.name,
    slug: piece.slug,
    price: piece.price ?? 0,
    originalPrice: undefined, // Piece type doesn't have originalPrice
    currency: 'AUD',
    images:
      piece.allImages?.map(
        (img) => img.variants.large?.url || img.variants.original.url,
      ) ||
      (piece.primaryImage
        ? [
            piece.primaryImage.variants.large?.url ||
              piece.primaryImage.variants.original.url,
          ]
        : []),
    rating: piece.avgRating || 0,
    reviewCount: piece.reviewCount || 0,
    seller: {
      name: tenantName || 'Seller',
      slug: tenantSlug,
    },
    badges: [],
    href: `/${tenantSlug}/product/${piece.slug}`,
  }
}

/**
 * Maps a marketplace product (from marketplace API) to CardProduct format
 *
 * @param product - The product from marketplace API
 * @returns CardProduct formatted for EtsyProductCard component
 */
export function mapMarketplaceProduct(product: {
  id: string
  name: string
  slug?: string
  price: number
  originalPrice?: number
  images?: string[]
  rating?: number
  marketplace?: {
    avgRating?: number
    totalReviews?: number
  }
  freeShipping?: boolean
  featured?: boolean
  seller?: {
    tenantId?: string
    businessName?: string
  }
}): CardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.id,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: 'AUD',
    images: product.images || [],
    rating: product.marketplace?.avgRating || product.rating || 0,
    reviewCount: product.marketplace?.totalReviews || 0,
    seller: {
      name: product.seller?.businessName || 'Seller',
      slug: product.seller?.tenantId,
    },
    badges: [
      ...(product.freeShipping ? ['freeShipping' as const] : []),
      ...(product.featured ? ['bestseller' as const] : []),
      ...(product.originalPrice ? ['sale' as const] : []),
    ],
  }
}
