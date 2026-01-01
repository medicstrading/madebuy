/**
 * Review Types
 * Product reviews with verification and moderation
 */

export interface Review {
  id: string;
  tenantId: string;
  pieceId: string;
  orderId: string;

  rating: number;  // 1-5
  title?: string;
  content: string;

  // Reviewer info
  reviewerName: string;
  reviewerEmail: string;
  verifiedPurchase: boolean;

  // Media
  photos?: string[];

  // Seller response
  sellerResponse?: string;
  sellerRespondedAt?: Date;

  // Moderation
  status: ReviewStatus;
  helpfulCount: number;
  reportCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  verifiedPurchaseCount?: number;
}

export interface CreateReviewInput {
  pieceId: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  reviewerName: string;
  reviewerEmail: string;
  photos?: string[];
}

export interface UpdateReviewInput {
  status?: ReviewStatus;
  sellerResponse?: string;
}

export interface ReviewFilters {
  pieceId?: string;
  status?: ReviewStatus;
  rating?: number;
  verifiedPurchase?: boolean;
  page?: number;
  limit?: number;
}
