/**
 * Marketplace Repository - Cross-tenant marketplace queries
 *
 * CRITICAL: These queries are CROSS-TENANT (no tenantId filter)
 * Used for unified marketplace browsing across all sellers
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Product,
  ProductWithSeller,
  MarketplaceReview,
  SellerProfile,
  Dispute,
  FeaturedPlacement,
  TenantMarketplaceStats,
  MarketplaceProductFilters,
  MarketplaceSearchResult,
  ReviewSummary,
  SellerBadge,
} from '@madebuy/shared'

/**
 * List marketplace products (CROSS-TENANT)
 * Used for: homepage, category pages, search results
 */
export async function listMarketplaceProducts(
  filters: MarketplaceProductFilters
): Promise<MarketplaceSearchResult> {
  const db = await getDatabase()

  // Base query: only approved, listed products
  const query: any = {
    'marketplace.listed': true,
    'marketplace.approvalStatus': 'approved',
  }

  // Category filter
  if (filters.category) {
    query['marketplace.categories'] = filters.category
  }

  // Subcategory filter
  if (filters.subcategory) {
    query['subcategory'] = filters.subcategory
  }

  // Price range
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {}
    if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice
    if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice
  }

  // Minimum rating
  if (filters.minRating) {
    query['marketplace.avgRating'] = { $gte: filters.minRating }
  }

  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search }
  }

  // Sort options
  let sort: any = {}
  switch (filters.sortBy) {
    case 'recent':
      sort = { createdAt: -1 }
      break
    case 'popular':
      sort = { 'marketplace.marketplaceViews': -1 }
      break
    case 'price_low':
      sort = { price: 1 }
      break
    case 'price_high':
      sort = { price: -1 }
      break
    case 'rating':
      sort = { 'marketplace.avgRating': -1 }
      break
    case 'bestseller':
      sort = { 'marketplace.marketplaceSales': -1 }
      break
    default:
      sort = { createdAt: -1 }
  }

  // Pagination
  const page = filters.page || 1
  const limit = filters.limit || 24
  const skip = (page - 1) * limit

  // Execute query
  const [products, total] = await Promise.all([
    db.collection('products')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('products').countDocuments(query)
  ])

  return {
    products: products as any[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Get product with seller info and reviews
 * Used for: product detail page
 */
export async function getMarketplaceProduct(productIdOrSlug: string): Promise<ProductWithSeller | null> {
  const db = await getDatabase()

  // Look up by id or slug since product cards link via slug
  const product = await db.collection('products').findOne({
    $or: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
    'marketplace.listed': true,
    'marketplace.approvalStatus': 'approved'
  }) as Product | null

  if (!product) return null

  // Fetch seller profile
  const sellerProfile = await getSellerProfile(product.tenantId)

  // Construct ProductWithSeller
  const productWithSeller: ProductWithSeller = {
    ...product,
    primaryImage: undefined, // Populated by frontend with media
    allImages: [],
    seller: {
      tenantId: product.tenantId,
      displayName: sellerProfile?.displayName || product.tenantId,
      businessName: undefined, // Fetched from tenant if needed
      avatar: sellerProfile?.avatar,
      location: sellerProfile?.location,
      avgRating: sellerProfile?.stats.avgRating || 0,
      totalReviews: sellerProfile?.stats.totalReviews || 0,
      badges: sellerProfile?.badges || [],
      memberSince: sellerProfile?.memberSince || product.createdAt,
    }
  }

  return productWithSeller
}

/**
 * Record marketplace view (analytics)
 */
export async function recordMarketplaceView(productId: string): Promise<void> {
  const db = await getDatabase()

  await db.collection('products').updateOne(
    { id: productId },
    {
      $inc: { 'marketplace.marketplaceViews': 1 },
      $set: { updatedAt: new Date() }
    }
  )
}

/**
 * Record marketplace sale (analytics)
 * Called when an order is completed from marketplace traffic
 */
export async function recordMarketplaceSale(
  productId: string,
  tenantId: string,
  amount: number
): Promise<void> {
  const db = await getDatabase()

  // Update product stats
  await db.collection('products').updateOne(
    { id: productId },
    {
      $inc: { 'marketplace.marketplaceSales': 1 },
      $set: { updatedAt: new Date() }
    }
  )

  // Update tenant marketplace stats
  await db.collection('tenant_marketplace_stats').updateOne(
    { tenantId },
    {
      $inc: {
        marketplaceSales: 1,
        marketplaceRevenue: amount
      },
      $set: {
        lastMarketplaceSale: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  )
}

/**
 * Get seller profile (public)
 */
export async function getSellerProfile(tenantId: string): Promise<SellerProfile | null> {
  const db = await getDatabase()
  return await db.collection('seller_profiles').findOne({ tenantId }) as SellerProfile | null
}

/**
 * Update seller profile
 */
export async function updateSellerProfile(
  tenantId: string,
  updates: Partial<SellerProfile>
): Promise<SellerProfile | null> {
  const db = await getDatabase()

  await db.collection('seller_profiles').updateOne(
    { tenantId },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  )

  return await getSellerProfile(tenantId)
}

/**
 * Create seller profile (called on first marketplace opt-in)
 */
export async function createSellerProfile(input: {
  tenantId: string
  displayName: string
  bio?: string
  location?: string
  verification?: SellerProfile['verification']
}): Promise<SellerProfile> {
  const db = await getDatabase()

  const profile: SellerProfile = {
    tenantId: input.tenantId,
    displayName: input.displayName,
    bio: input.bio,
    location: input.location,
    verification: input.verification || {
      status: 'unverified',
    },
    stats: {
      totalSales: 0,
      avgRating: 0,
      totalReviews: 0,
      responseRate: 0,
      avgResponseTime: 0,
      onTimeDeliveryRate: 0,
      repeatCustomerRate: 0,
    },
    badges: [],
    memberSince: new Date(),
    customizationAvailable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('seller_profiles').insertOne(profile)
  return profile
}

/**
 * List products by seller
 */
export async function listSellerProducts(
  tenantId: string,
  page: number = 1,
  limit: number = 24
): Promise<MarketplaceSearchResult> {
  const db = await getDatabase()

  const query = {
    tenantId,
    'marketplace.listed': true,
    'marketplace.approvalStatus': 'approved'
  }

  const skip = (page - 1) * limit

  const [products, total] = await Promise.all([
    db.collection('products')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('products').countDocuments(query)
  ])

  return {
    products: products as any[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Get top sellers (by sales or rating)
 */
export async function getTopSellers(limit: number = 10): Promise<SellerProfile[]> {
  const db = await getDatabase()

  const sellers = await db.collection('seller_profiles')
    .find({})
    .sort({ 'stats.totalSales': -1, 'stats.avgRating': -1 })
    .limit(limit)
    .toArray()

  return sellers as unknown as SellerProfile[]
}

// ============================
// REVIEWS
// ============================

/**
 * Create review (verified purchase only)
 */
export async function createReview(review: Omit<MarketplaceReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceReview> {
  const db = await getDatabase()

  const newReview: MarketplaceReview = {
    ...review,
    id: nanoid(),
    helpful: 0,
    notHelpful: 0,
    status: 'pending', // Manual approval initially
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('marketplace_reviews').insertOne(newReview)

  // Update product rating (if auto-approved)
  if (newReview.status === 'published') {
    await recalculateProductRating(review.productId)
  }

  return newReview
}

/**
 * List reviews for a product
 */
export async function listProductReviews(
  productId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ reviews: MarketplaceReview[]; total: number }> {
  const db = await getDatabase()

  const query = {
    productId,
    status: 'published'
  }

  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    db.collection('marketplace_reviews')
      .find(query)
      .sort({ helpful: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('marketplace_reviews').countDocuments(query)
  ])

  return {
    reviews: reviews as unknown as MarketplaceReview[],
    total
  }
}

/**
 * Get review summary for a product
 */
export async function getProductReviewSummary(productId: string): Promise<ReviewSummary> {
  const db = await getDatabase()

  const reviews = await db.collection('marketplace_reviews')
    .find({ productId, status: 'published' })
    .toArray() as unknown as MarketplaceReview[]

  if (reviews.length === 0) {
    return {
      avgRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPurchasePercentage: 0
    }
  }

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let totalRating = 0
  let verifiedCount = 0

  reviews.forEach(review => {
    totalRating += review.rating
    distribution[review.rating]++
    if (review.verified) verifiedCount++
  })

  return {
    avgRating: totalRating / reviews.length,
    totalReviews: reviews.length,
    ratingDistribution: distribution as any,
    verifiedPurchasePercentage: (verifiedCount / reviews.length) * 100
  }
}

/**
 * Recalculate product rating after review changes
 */
export async function recalculateProductRating(productId: string): Promise<void> {
  const db = await getDatabase()

  const summary = await getProductReviewSummary(productId)

  await db.collection('products').updateOne(
    { id: productId },
    {
      $set: {
        'marketplace.avgRating': summary.avgRating,
        'marketplace.totalReviews': summary.totalReviews,
        updatedAt: new Date()
      }
    }
  )

  // Update seller rating
  const product = await db.collection('products').findOne({ id: productId }) as Product | null
  if (product) {
    await recalculateSellerRating(product.tenantId)
  }
}

/**
 * Recalculate seller overall rating
 */
export async function recalculateSellerRating(tenantId: string): Promise<void> {
  const db = await getDatabase()

  // Get all seller's products with reviews
  const products = await db.collection('products')
    .find({
      tenantId,
      'marketplace.totalReviews': { $gt: 0 }
    })
    .toArray() as unknown as Product[]

  if (products.length === 0) return

  let totalRating = 0
  let totalReviews = 0

  products.forEach(product => {
    totalRating += product.marketplace.avgRating * product.marketplace.totalReviews
    totalReviews += product.marketplace.totalReviews
  })

  const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0

  await db.collection('seller_profiles').updateOne(
    { tenantId },
    {
      $set: {
        'stats.avgRating': avgRating,
        'stats.totalReviews': totalReviews,
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Add seller response to review
 */
export async function addSellerResponse(
  reviewId: string,
  tenantId: string,
  comment: string
): Promise<void> {
  const db = await getDatabase()

  // Verify seller owns the product being reviewed
  const review = await db.collection('marketplace_reviews').findOne({ id: reviewId }) as MarketplaceReview | null
  if (!review || review.tenantId !== tenantId) {
    throw new Error('Unauthorized')
  }

  await db.collection('marketplace_reviews').updateOne(
    { id: reviewId },
    {
      $set: {
        sellerResponse: {
          comment,
          respondedAt: new Date()
        },
        updatedAt: new Date()
      }
    }
  )
}

// ============================
// DISPUTES
// ============================

/**
 * Create dispute (48-hour resolution window)
 */
export async function createDispute(dispute: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dispute> {
  const db = await getDatabase()

  const resolutionDeadline = new Date()
  resolutionDeadline.setHours(resolutionDeadline.getHours() + 48)

  const newDispute: Dispute = {
    ...dispute,
    id: nanoid(),
    status: 'open',
    resolutionDeadline,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('disputes').insertOne(newDispute)

  // TODO: Send email to seller
  // TODO: Hold payment if not yet released

  return newDispute
}

/**
 * Get dispute by ID
 */
export async function getDispute(disputeId: string): Promise<Dispute | null> {
  const db = await getDatabase()
  return await db.collection('disputes').findOne({ id: disputeId }) as Dispute | null
}

/**
 * List disputes for buyer
 */
export async function listBuyerDisputes(buyerId: string): Promise<Dispute[]> {
  const db = await getDatabase()
  return await db.collection('disputes')
    .find({ buyerId })
    .sort({ createdAt: -1 })
    .toArray() as unknown as Dispute[]
}

/**
 * List disputes for seller
 */
export async function listSellerDisputes(sellerId: string, status?: Dispute['status']): Promise<Dispute[]> {
  const db = await getDatabase()

  const query: any = { sellerId }
  if (status) query.status = status

  return await db.collection('disputes')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray() as unknown as Dispute[]
}

/**
 * Add seller evidence to dispute
 */
export async function addSellerEvidence(
  disputeId: string,
  sellerId: string,
  evidence: Dispute['sellerEvidence']
): Promise<void> {
  const db = await getDatabase()

  // Verify seller owns this dispute
  const dispute = await getDispute(disputeId)
  if (!dispute || dispute.sellerId !== sellerId) {
    throw new Error('Unauthorized')
  }

  await db.collection('disputes').updateOne(
    { id: disputeId },
    {
      $set: {
        sellerEvidence: evidence,
        sellerRespondedAt: new Date(),
        status: 'seller_responded',
        updatedAt: new Date()
      }
    }
  )
}

/**
 * Resolve dispute (admin or automated)
 */
export async function resolveDispute(
  disputeId: string,
  resolution: Dispute['resolution']
): Promise<void> {
  const db = await getDatabase()

  await db.collection('disputes').updateOne(
    { id: disputeId },
    {
      $set: {
        resolution,
        status: 'resolved',
        closedAt: new Date(),
        updatedAt: new Date()
      }
    }
  )

  // TODO: Process refund if applicable
  // TODO: Send resolution emails to buyer and seller
}

// ============================
// FEATURED PLACEMENTS
// ============================

/**
 * Create featured placement (Business tier only)
 */
export async function createFeaturedPlacement(placement: Omit<FeaturedPlacement, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeaturedPlacement> {
  const db = await getDatabase()

  const newPlacement: FeaturedPlacement = {
    ...placement,
    id: nanoid(),
    impressions: 0,
    clicks: 0,
    sales: 0,
    revenue: 0,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('featured_placements').insertOne(newPlacement)
  return newPlacement
}

/**
 * Get active featured placements
 */
export async function getActiveFeaturedPlacements(placement: FeaturedPlacement['placement']): Promise<FeaturedPlacement[]> {
  const db = await getDatabase()

  const now = new Date()

  return await db.collection('featured_placements')
    .find({
      placement,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
    .toArray() as unknown as FeaturedPlacement[]
}

/**
 * Record featured placement click
 */
export async function recordFeaturedClick(placementId: string): Promise<void> {
  const db = await getDatabase()

  await db.collection('featured_placements').updateOne(
    { id: placementId },
    {
      $inc: { clicks: 1 },
      $set: { updatedAt: new Date() }
    }
  )
}

// ============================
// TENANT MARKETPLACE STATS
// ============================

/**
 * Get tenant marketplace stats
 */
export async function getTenantMarketplaceStats(tenantId: string): Promise<TenantMarketplaceStats | null> {
  const db = await getDatabase()
  return await db.collection('tenant_marketplace_stats').findOne({ tenantId }) as TenantMarketplaceStats | null
}

/**
 * Initialize tenant marketplace stats (on first opt-in)
 */
export async function initializeTenantMarketplaceStats(tenantId: string): Promise<void> {
  const db = await getDatabase()

  const stats: TenantMarketplaceStats = {
    tenantId,
    marketplaceViews: 0,
    directViews: 0,
    marketplaceSales: 0,
    directSales: 0,
    marketplaceRevenue: 0,
    directRevenue: 0,
    totalProductsListed: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    avgRating: 0,
    totalReviews: 0,
    fiveStarReviews: 0,
    fourStarReviews: 0,
    threeStarReviews: 0,
    twoStarReviews: 0,
    oneStarReviews: 0,
    totalCustomers: 0,
    repeatCustomers: 0,
    repeatCustomerRate: 0,
    avgResponseTime: 0,
    responseRate: 0,
    onTimeDeliveryRate: 0,
    avgShippingTime: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('tenant_marketplace_stats').insertOne(stats)
}
