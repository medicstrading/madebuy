/**
 * Bundle - Product bundles for discounted multi-product purchases
 */

export type BundleStatus = 'active' | 'draft' | 'archived'

/**
 * BundlePiece - A piece included in a bundle with quantity
 */
export interface BundlePiece {
  pieceId: string
  quantity: number
}

/**
 * Bundle - A collection of pieces sold together at a discounted price
 */
export interface Bundle {
  id: string
  tenantId: string
  name: string
  description?: string
  slug: string
  pieces: BundlePiece[]
  bundlePrice: number // Discounted price in cents
  originalPrice: number // Sum of individual prices in cents
  discountPercent: number // Calculated savings percentage
  status: BundleStatus
  imageId?: string // Primary image
  createdAt: Date
  updatedAt: Date
}

/**
 * CreateBundleInput - Input for creating a new bundle
 */
export interface CreateBundleInput {
  name: string
  description?: string
  slug?: string // Auto-generated if not provided
  pieces: BundlePiece[]
  bundlePrice: number // Price in cents
  status?: BundleStatus
  imageId?: string
}

/**
 * UpdateBundleInput - Input for updating an existing bundle
 */
export interface UpdateBundleInput {
  name?: string
  description?: string
  slug?: string
  pieces?: BundlePiece[]
  bundlePrice?: number
  status?: BundleStatus
  imageId?: string
}

/**
 * BundleListOptions - Options for listing bundles
 */
export interface BundleListOptions {
  status?: BundleStatus | BundleStatus[]
  limit?: number
  offset?: number
  sortBy?:
    | 'name'
    | 'bundlePrice'
    | 'discountPercent'
    | 'createdAt'
    | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * BundleWithPieces - Bundle with populated piece details
 * Used in storefront for display
 */
export interface BundleWithPieces extends Bundle {
  pieceDetails: {
    id: string
    name: string
    price?: number
    stock?: number
    thumbnailUrl?: string
    quantity: number
  }[]
  isAvailable: boolean // All pieces have sufficient stock
}

/**
 * BundleCartItem - Represents a bundle in the cart
 * Contains all pieces but tracked as a single bundle purchase
 */
export interface BundleCartItem {
  bundleId: string
  bundleName: string
  bundlePrice: number
  originalPrice: number
  discountPercent: number
  pieces: {
    pieceId: string
    pieceName: string
    quantity: number
    price: number
  }[]
  quantity: number // How many of this bundle in cart
}

/**
 * BundleProductData - Metadata attached to a product representing a bundle
 * Used when a bundle is added to cart as a pseudo-product
 * (P2 type safety fix)
 */
export interface BundleProductData {
  bundleId: string
  originalPrice: number
  discountPercent: number
  pieces: BundlePiece[]
}

/**
 * Type guard to check if a product has bundle data
 */
export function hasBundleData(product: {
  id: string
  _bundleData?: BundleProductData
}): product is { id: string; _bundleData: BundleProductData } {
  return product.id.startsWith('bundle_') && product._bundleData != null
}
