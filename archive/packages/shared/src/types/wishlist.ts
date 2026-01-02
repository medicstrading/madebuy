/**
 * Wishlist Types
 * Supports guest wishlists (cookie-based visitorId)
 */

export interface WishlistItem {
  id: string;
  visitorId: string;
  pieceId: string;
  tenantId: string;
  addedAt: Date;
}

export interface WishlistFilters {
  visitorId?: string;
  pieceId?: string;
  tenantId?: string;
}

export interface AddToWishlistInput {
  visitorId: string;
  pieceId: string;
  tenantId: string;
}
