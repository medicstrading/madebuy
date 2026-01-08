/**
 * Wishlist Types
 * Customer wishlists for saving products to purchase later
 */

export interface WishlistItem {
  id: string
  tenantId: string
  pieceId: string
  customerEmail?: string // For logged-in users
  sessionId?: string // For guest users
  variantId?: string // Optional specific variant
  addedAt: Date
}

export interface CreateWishlistItemInput {
  pieceId: string
  customerEmail?: string
  sessionId?: string
  variantId?: string
}

export interface WishlistWithProduct extends WishlistItem {
  product?: {
    name: string
    slug: string
    price: number
    imageUrl?: string
    inStock: boolean
  }
}
