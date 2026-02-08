import type {
  CreateReviewInput,
  Order,
  ProductReviewStats,
  Review,
  ReviewListOptions,
  ReviewModerationInput,
  UpdateReviewInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/**
 * Create a new review
 * REV-05 FIX: Accepts optional order to determine verified purchase status
 */
export async function createReview(
  tenantId: string,
  data: CreateReviewInput,
  order?: Order,
): Promise<Review> {
  const db = await getDatabase()

  // REV-05 FIX: Determine verified purchase based on actual order verification
  // If order is provided and valid, it's verified. Otherwise, it's not.
  const isVerifiedPurchase = !!order

  const review: Review = {
    id: nanoid(),
    tenantId,
    pieceId: data.pieceId,
    orderId: data.orderId,
    customerId: data.customerId,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    rating: Math.min(5, Math.max(1, data.rating)), // Clamp 1-5
    title: data.title,
    text: data.text,
    photos: data.photos || [],
    status: 'pending', // All reviews start as pending moderation
    isVerifiedPurchase, // REV-05 FIX: Based on actual order verification
    helpfulCount: 0,
    reportCount: 0,
    helpfulVoters: [], // REV-07: Initialize empty voter tracking arrays
    reportVoters: [], // REV-07: Initialize empty voter tracking arrays
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('reviews').insertOne(review)
  return review
}

/**
 * Get a single review by ID
 */
export async function getReview(
  tenantId: string,
  id: string,
): Promise<Review | null> {
  const db = await getDatabase()
  return (await db
    .collection('reviews')
    .findOne({ tenantId, id })) as Review | null
}

/**
 * Get a review by ID without requiring tenantId
 * Used for vote endpoints where we need to derive tenantId from the review
 */
export async function getReviewById(id: string): Promise<Review | null> {
  const db = await getDatabase()
  return (await db.collection('reviews').findOne({ id })) as Review | null
}

/**
 * Check if a customer has already reviewed a piece for an order
 */
export async function hasReviewedOrder(
  tenantId: string,
  orderId: string,
  pieceId: string,
): Promise<boolean> {
  const db = await getDatabase()
  const existing = await db.collection('reviews').findOne({
    tenantId,
    orderId,
    pieceId,
  })
  return !!existing
}

/**
 * REV-04 FIX: Check if a customer has already reviewed a piece (by email)
 * This prevents the same customer from submitting multiple reviews
 */
export async function hasCustomerReviewedPiece(
  tenantId: string,
  pieceId: string,
  customerEmail: string,
): Promise<boolean> {
  const db = await getDatabase()
  const existing = await db.collection('reviews').findOne({
    tenantId,
    pieceId,
    customerEmail: customerEmail.toLowerCase(), // Case-insensitive match
  })
  return !!existing
}

/**
 * List reviews with filters and pagination
 */
export async function listReviews(
  tenantId: string,
  options?: ReviewListOptions,
): Promise<Review[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (options?.filters?.pieceId) {
    query.pieceId = options.filters.pieceId
  }

  if (options?.filters?.status) {
    query.status = options.filters.status
  }

  if (options?.filters?.rating) {
    query.rating = options.filters.rating
  }

  if (options?.filters?.minRating) {
    query.rating = { $gte: options.filters.minRating }
  }

  if (options?.filters?.isVerifiedPurchase !== undefined) {
    query.isVerifiedPurchase = options.filters.isVerifiedPurchase
  }

  const sortField = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1

  let cursor = db
    .collection('reviews')
    .find(query)
    .sort({ [sortField]: sortOrder })

  if (options?.offset) {
    cursor = cursor.skip(options.offset)
  }

  if (options?.limit) {
    cursor = cursor.limit(options.limit)
  }

  return (await cursor.toArray()) as unknown as Review[]
}

/**
 * List approved reviews for a product (public endpoint)
 */
export async function listApprovedReviews(
  tenantId: string,
  pieceId: string,
  options?: { limit?: number; offset?: number },
): Promise<Review[]> {
  const db = await getDatabase()

  let cursor = db
    .collection('reviews')
    .find({
      tenantId,
      pieceId,
      status: 'approved',
    })
    .sort({ createdAt: -1 })

  if (options?.offset) {
    cursor = cursor.skip(options.offset)
  }

  if (options?.limit) {
    cursor = cursor.limit(options.limit)
  }

  return (await cursor.toArray()) as unknown as Review[]
}

/**
 * Update a review
 */
export async function updateReview(
  tenantId: string,
  id: string,
  data: UpdateReviewInput,
): Promise<Review | null> {
  const db = await getDatabase()

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (data.rating !== undefined) {
    updates.rating = Math.min(5, Math.max(1, data.rating))
  }

  if (data.title !== undefined) {
    updates.title = data.title
  }

  if (data.text !== undefined) {
    updates.text = data.text
  }

  if (data.photos !== undefined) {
    updates.photos = data.photos
  }

  await db.collection('reviews').updateOne({ tenantId, id }, { $set: updates })

  return getReview(tenantId, id)
}

/**
 * Moderate a review (approve, reject, or add seller response)
 */
export async function moderateReview(
  tenantId: string,
  id: string,
  moderation: ReviewModerationInput,
): Promise<Review | null> {
  const db = await getDatabase()

  const updates: Record<string, unknown> = {
    status: moderation.status,
    updatedAt: new Date(),
  }

  if (moderation.sellerResponse !== undefined) {
    updates.sellerResponse = moderation.sellerResponse
    updates.sellerRespondedAt = new Date()
  }

  await db.collection('reviews').updateOne({ tenantId, id }, { $set: updates })

  // If approved, update product review stats
  if (moderation.status === 'approved') {
    const review = await getReview(tenantId, id)
    if (review) {
      await updateProductReviewStats(tenantId, review.pieceId)
    }
  }

  return getReview(tenantId, id)
}

/**
 * Delete a review
 */
export async function deleteReview(
  tenantId: string,
  id: string,
): Promise<void> {
  const db = await getDatabase()
  const review = await getReview(tenantId, id)

  await db.collection('reviews').deleteOne({ tenantId, id })

  // Update product stats after deletion
  if (review) {
    await updateProductReviewStats(tenantId, review.pieceId)
  }
}

/**
 * REV-07 FIX: Mark a review as helpful with voter tracking
 * Returns true if vote was recorded, false if user already voted
 */
export async function markReviewHelpful(
  tenantId: string,
  id: string,
  voterId: string,
): Promise<boolean> {
  const db = await getDatabase()

  // Try to add the voter to the helpfulVoters array
  const result = await db.collection('reviews').updateOne(
    { tenantId, id, helpfulVoters: { $ne: voterId } }, // Only update if voter not in array
    {
      $inc: { helpfulCount: 1 },
      $addToSet: { helpfulVoters: voterId },
      $set: { updatedAt: new Date() },
    },
  )

  return result.modifiedCount > 0
}

/**
 * REV-07 FIX: Report a review with voter tracking
 * Returns true if report was recorded, false if user already reported
 */
export async function reportReview(
  tenantId: string,
  id: string,
  voterId: string,
): Promise<boolean> {
  const db = await getDatabase()

  // Try to add the voter to the reportVoters array
  const result = await db.collection('reviews').updateOne(
    { tenantId, id, reportVoters: { $ne: voterId } }, // Only update if voter not in array
    {
      $inc: { reportCount: 1 },
      $addToSet: { reportVoters: voterId },
      $set: { updatedAt: new Date() },
    },
  )

  return result.modifiedCount > 0
}

/**
 * Get review statistics for a product
 */
export async function getProductReviewStats(
  tenantId: string,
  pieceId: string,
): Promise<ProductReviewStats> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        tenantId,
        pieceId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        verifiedPurchaseCount: {
          $sum: { $cond: ['$isVerifiedPurchase', 1, 0] },
        },
        withPhotosCount: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] },
              1,
              0,
            ],
          },
        },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]

  const result = await db.collection('reviews').aggregate(pipeline).toArray()

  if (result.length === 0) {
    return {
      pieceId,
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      verifiedPurchaseCount: 0,
      withPhotosCount: 0,
    }
  }

  const stats = result[0]
  return {
    pieceId,
    averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
    totalReviews: stats.totalReviews || 0,
    ratingBreakdown: {
      '1': stats.rating1 || 0,
      '2': stats.rating2 || 0,
      '3': stats.rating3 || 0,
      '4': stats.rating4 || 0,
      '5': stats.rating5 || 0,
    },
    verifiedPurchaseCount: stats.verifiedPurchaseCount || 0,
    withPhotosCount: stats.withPhotosCount || 0,
  }
}

/**
 * Update cached review stats on a piece document
 * Call this when reviews are added, approved, or deleted
 */
export async function updateProductReviewStats(
  tenantId: string,
  pieceId: string,
): Promise<void> {
  const db = await getDatabase()
  const stats = await getProductReviewStats(tenantId, pieceId)

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    {
      $set: {
        avgRating: stats.averageRating,
        reviewCount: stats.totalReviews,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Get count of pending reviews for a tenant
 */
export async function getPendingReviewCount(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('reviews').countDocuments({
    tenantId,
    status: 'pending',
  })
}

/**
 * Get reviews requiring moderation
 */
export async function getReviewsForModeration(
  tenantId: string,
  limit: number = 20,
): Promise<Review[]> {
  const db = await getDatabase()

  const reviews = await db
    .collection('reviews')
    .find({
      tenantId,
      status: 'pending',
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return reviews as unknown as Review[]
}

/**
 * Review with associated product metadata
 */
export interface ReviewWithPiece extends Review {
  piece?: {
    name: string
    slug: string
    thumbnail?: string
  }
}

/**
 * List recent approved reviews across all products for a tenant.
 * Includes piece metadata (name, slug, thumbnail) with each review.
 */
export async function listRecentApprovedReviews(
  tenantId: string,
  limit: number = 6,
): Promise<ReviewWithPiece[]> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        tenantId,
        status: 'approved',
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'pieces',
        let: { pieceId: '$pieceId' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$id', '$$pieceId'] },
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              thumbnail: { $arrayElemAt: ['$images', 0] },
            },
          },
        ],
        as: 'pieceData',
      },
    },
    {
      $addFields: {
        piece: { $arrayElemAt: ['$pieceData', 0] },
      },
    },
    {
      $project: {
        pieceData: 0,
      },
    },
  ]

  const results = await db.collection('reviews').aggregate(pipeline).toArray()
  return results as unknown as ReviewWithPiece[]
}

/**
 * Get aggregated review stats for a tenant (across all products)
 */
export async function getTenantReviewStats(tenantId: string): Promise<{
  averageRating: number
  totalReviews: number
  ratingBreakdown: Record<string, number>
}> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        tenantId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]

  const result = await db.collection('reviews').aggregate(pipeline).toArray()

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    }
  }

  const stats = result[0]
  return {
    averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
    totalReviews: stats.totalReviews || 0,
    ratingBreakdown: {
      '1': stats.rating1 || 0,
      '2': stats.rating2 || 0,
      '3': stats.rating3 || 0,
      '4': stats.rating4 || 0,
      '5': stats.rating5 || 0,
    },
  }
}
