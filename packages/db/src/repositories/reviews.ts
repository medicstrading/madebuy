/**
 * Reviews Repository
 * Product reviews with verification and moderation
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Review,
  ReviewStatus,
  ReviewSummary,
  CreateReviewInput,
  ReviewFilters,
} from '@madebuy/shared'

/**
 * Create a new review
 */
export async function createReview(
  tenantId: string,
  input: CreateReviewInput,
  verifiedPurchase: boolean = false
): Promise<Review> {
  const db = await getDatabase()

  const review: Review = {
    id: nanoid(),
    tenantId,
    pieceId: input.pieceId,
    orderId: input.orderId,
    rating: input.rating,
    title: input.title,
    content: input.content,
    reviewerName: input.reviewerName,
    reviewerEmail: input.reviewerEmail,
    verifiedPurchase,
    photos: input.photos || [],
    status: 'pending',
    helpfulCount: 0,
    reportCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('reviews').insertOne(review)
  return review
}

/**
 * Get a review by ID
 */
export async function getReview(tenantId: string, reviewId: string): Promise<Review | null> {
  const db = await getDatabase()
  return await db.collection('reviews').findOne({ tenantId, id: reviewId }) as Review | null
}

/**
 * Get reviews for a piece/product
 */
export async function getReviewsByPiece(
  tenantId: string,
  pieceId: string,
  filters?: ReviewFilters
): Promise<{ reviews: Review[]; total: number }> {
  const db = await getDatabase()

  const query: any = {
    tenantId,
    pieceId,
    status: 'approved', // Only show approved reviews publicly
  }

  if (filters?.rating) {
    query.rating = filters.rating
  }

  if (filters?.verifiedPurchase !== undefined) {
    query.verifiedPurchase = filters.verifiedPurchase
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 10
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    db.collection('reviews')
      .find(query)
      .sort({ helpfulCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('reviews').countDocuments(query)
  ])

  return {
    reviews: reviews as unknown as Review[],
    total
  }
}

/**
 * Get all reviews for a tenant (seller's dashboard)
 */
export async function getReviewsByTenant(
  tenantId: string,
  filters?: ReviewFilters
): Promise<{ reviews: Review[]; total: number }> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }

  if (filters?.rating) {
    query.rating = filters.rating
  }

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    db.collection('reviews')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('reviews').countDocuments(query)
  ])

  return {
    reviews: reviews as unknown as Review[],
    total
  }
}

/**
 * Update review status (approve/reject)
 */
export async function updateReviewStatus(
  tenantId: string,
  reviewId: string,
  status: ReviewStatus
): Promise<void> {
  const db = await getDatabase()

  await db.collection('reviews').updateOne(
    { tenantId, id: reviewId },
    {
      $set: {
        status,
        updatedAt: new Date(),
      }
    }
  )

  // If approved, recalculate product rating
  if (status === 'approved') {
    const review = await getReview(tenantId, reviewId)
    if (review) {
      await recalculatePieceRating(tenantId, review.pieceId)
    }
  }
}

/**
 * Add seller response to a review
 */
export async function addSellerResponse(
  tenantId: string,
  reviewId: string,
  response: string
): Promise<void> {
  const db = await getDatabase()

  await db.collection('reviews').updateOne(
    { tenantId, id: reviewId },
    {
      $set: {
        sellerResponse: response,
        sellerRespondedAt: new Date(),
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Get review summary for a piece
 */
export async function getReviewSummary(tenantId: string, pieceId: string): Promise<ReviewSummary> {
  const db = await getDatabase()

  const reviews = await db.collection('reviews')
    .find({ tenantId, pieceId, status: 'approved' })
    .toArray() as unknown as Review[]

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPurchaseCount: 0,
    }
  }

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let totalRating = 0
  let verifiedCount = 0

  reviews.forEach(review => {
    totalRating += review.rating
    distribution[review.rating]++
    if (review.verifiedPurchase) verifiedCount++
  })

  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution: distribution,
    verifiedPurchaseCount: verifiedCount,
  }
}

/**
 * Get review summary for entire tenant (seller)
 */
export async function getTenantReviewSummary(tenantId: string): Promise<ReviewSummary> {
  const db = await getDatabase()

  const reviews = await db.collection('reviews')
    .find({ tenantId, status: 'approved' })
    .toArray() as unknown as Review[]

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPurchaseCount: 0,
    }
  }

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let totalRating = 0
  let verifiedCount = 0

  reviews.forEach(review => {
    totalRating += review.rating
    distribution[review.rating]++
    if (review.verifiedPurchase) verifiedCount++
  })

  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution: distribution,
    verifiedPurchaseCount: verifiedCount,
  }
}

/**
 * Increment helpful count
 */
export async function markReviewHelpful(reviewId: string): Promise<void> {
  const db = await getDatabase()

  await db.collection('reviews').updateOne(
    { id: reviewId },
    {
      $inc: { helpfulCount: 1 },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Report a review
 */
export async function reportReview(reviewId: string): Promise<void> {
  const db = await getDatabase()

  await db.collection('reviews').updateOne(
    { id: reviewId },
    {
      $inc: { reportCount: 1 },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Check if customer has already reviewed a piece for an order
 */
export async function hasReviewed(
  tenantId: string,
  orderId: string,
  pieceId: string
): Promise<boolean> {
  const db = await getDatabase()

  const review = await db.collection('reviews').findOne({
    tenantId,
    orderId,
    pieceId,
  })

  return !!review
}

/**
 * Delete a review
 */
export async function deleteReview(tenantId: string, reviewId: string): Promise<boolean> {
  const db = await getDatabase()

  const review = await getReview(tenantId, reviewId)
  if (!review) return false

  await db.collection('reviews').deleteOne({ tenantId, id: reviewId })

  // Recalculate rating if it was approved
  if (review.status === 'approved') {
    await recalculatePieceRating(tenantId, review.pieceId)
  }

  return true
}

/**
 * Recalculate piece rating after review changes
 */
async function recalculatePieceRating(tenantId: string, pieceId: string): Promise<void> {
  const db = await getDatabase()

  const summary = await getReviewSummary(tenantId, pieceId)

  // Update the piece/product with new rating
  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        'marketplace.avgRating': summary.averageRating,
        'marketplace.totalReviews': summary.totalReviews,
        updatedAt: new Date()
      }
    }
  )

  // Also update products collection if it exists
  await db.collection('products').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        'marketplace.avgRating': summary.averageRating,
        'marketplace.totalReviews': summary.totalReviews,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Get reviews awaiting moderation
 */
export async function getPendingReviews(tenantId: string): Promise<Review[]> {
  const db = await getDatabase()

  const reviews = await db.collection('reviews')
    .find({ tenantId, status: 'pending' })
    .sort({ createdAt: -1 })
    .toArray()

  return reviews as unknown as Review[]
}

/**
 * Get review counts by status for a tenant
 */
export async function getReviewCounts(tenantId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const db = await getDatabase()

  const [total, pending, approved, rejected] = await Promise.all([
    db.collection('reviews').countDocuments({ tenantId }),
    db.collection('reviews').countDocuments({ tenantId, status: 'pending' }),
    db.collection('reviews').countDocuments({ tenantId, status: 'approved' }),
    db.collection('reviews').countDocuments({ tenantId, status: 'rejected' }),
  ])

  return { total, pending, approved, rejected }
}

/**
 * Ensure indexes exist (call on app startup)
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()

  await db.collection('reviews').createIndex(
    { tenantId: 1, id: 1 },
    { unique: true, background: true }
  )
  await db.collection('reviews').createIndex(
    { tenantId: 1, pieceId: 1, status: 1 },
    { background: true }
  )
  await db.collection('reviews').createIndex(
    { tenantId: 1, status: 1, createdAt: -1 },
    { background: true }
  )
  await db.collection('reviews').createIndex(
    { tenantId: 1, orderId: 1, pieceId: 1 },
    { background: true }
  )
  await db.collection('reviews').createIndex(
    { reviewerEmail: 1 },
    { background: true }
  )
}
