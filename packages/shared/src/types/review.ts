/**
 * Review Types
 * Product reviews submitted by verified purchasers
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ReviewPhoto {
  id: string
  url: string
  thumbnailUrl?: string
  caption?: string
}

export interface Review {
  id: string
  tenantId: string
  pieceId: string
  orderId: string
  customerId?: string
  customerEmail: string
  customerName: string
  rating: number // 1-5 stars
  title?: string
  text: string
  photos: ReviewPhoto[]
  status: ReviewStatus
  isVerifiedPurchase: boolean
  sellerResponse?: string
  sellerRespondedAt?: Date
  helpfulCount: number
  reportCount: number
  // REV-07: Vote tracking arrays to prevent duplicate votes
  helpfulVoters?: string[] // IP addresses or session IDs of users who voted helpful
  reportVoters?: string[] // IP addresses or session IDs of users who reported
  createdAt: Date
  updatedAt: Date
}

export interface CreateReviewInput {
  pieceId: string
  orderId: string
  customerId?: string
  customerEmail: string
  customerName: string
  rating: number
  title?: string
  text: string
  photos?: ReviewPhoto[]
}

export interface UpdateReviewInput {
  rating?: number
  title?: string
  text?: string
  photos?: ReviewPhoto[]
}

export interface ReviewFilters {
  pieceId?: string
  status?: ReviewStatus
  rating?: number
  minRating?: number
  isVerifiedPurchase?: boolean
}

export interface ReviewListOptions {
  filters?: ReviewFilters
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount'
  sortOrder?: 'asc' | 'desc'
}

export interface ProductReviewStats {
  pieceId: string
  averageRating: number
  totalReviews: number
  ratingBreakdown: {
    '1': number
    '2': number
    '3': number
    '4': number
    '5': number
  }
  verifiedPurchaseCount: number
  withPhotosCount: number
}

export interface ReviewModerationInput {
  status: ReviewStatus
  sellerResponse?: string
}
