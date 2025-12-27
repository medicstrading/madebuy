/**
 * Marketplace-specific types for the unified MadeBuy marketplace
 * Reviews, seller profiles, disputes, categories, and marketplace config
 */

import type { SellerBadge } from './product'

/**
 * Marketplace Category Taxonomy
 */
export interface MarketplaceCategory {
  id: string
  name: string // "Art & Prints"
  slug: string // "art-prints"
  description: string
  icon: string // Icon identifier (e.g., "palette", "gem", "shirt")

  subcategories: string[] // ["paintings", "prints", "digital-art"]
  productCount: number // Cached count for performance

  // Featured products for this category
  featuredProducts: string[] // Product IDs

  // Display order
  order: number

  // SEO
  metaTitle?: string
  metaDescription?: string

  createdAt: Date
  updatedAt: Date
}

/**
 * Product Review System
 */
export interface MarketplaceReview {
  id: string
  productId: string
  tenantId: string // Seller
  buyerId: string // Reviewer (customer ID or email)
  orderId: string // Verified purchase

  // Rating (1-5 stars)
  rating: 1 | 2 | 3 | 4 | 5

  // Review content
  title: string
  comment: string
  photos?: string[] // mediaIds of review photos

  // Verification
  verified: boolean // Purchased and delivered
  verifiedPurchaseDate?: Date

  // Helpfulness
  helpful: number // Count of "helpful" votes
  notHelpful: number // Count of "not helpful" votes

  // Status
  status: 'pending' | 'published' | 'flagged' | 'removed'
  flagReason?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Seller response
  sellerResponse?: {
    comment: string
    respondedAt: Date
  }
}

/**
 * Seller Public Profile (for marketplace)
 */
export interface SellerProfile {
  tenantId: string

  // Display info
  displayName: string // Public name
  bio?: string // About the seller
  avatar?: string // mediaId
  coverImage?: string // mediaId
  location?: string // City, State or Country

  // Stats (cached for performance)
  stats: {
    totalSales: number
    avgRating: number
    totalReviews: number
    responseRate: number // % of messages replied to (0-100)
    avgResponseTime: number // Hours
    onTimeDeliveryRate: number // % (0-100)
    repeatCustomerRate: number // % (0-100)
  }

  // Seller badges
  badges: SellerBadge[]

  // Member since
  memberSince: Date

  // Policies
  shippingPolicy?: string
  returnPolicy?: string
  customizationAvailable: boolean
  processingTime?: string // "1-3 business days"

  // Social links
  socialLinks?: {
    instagram?: string
    facebook?: string
    tiktok?: string
    pinterest?: string
    website?: string
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// SellerBadge imported from product.ts to avoid duplication

/**
 * Dispute Resolution System (48-hour window)
 */
export interface Dispute {
  id: string
  orderId: string
  buyerId: string // Customer
  sellerId: string // Tenant ID

  // Claim type
  claimType: 'damage' | 'not_as_described' | 'not_received' | 'wrong_item' | 'quality_issue'

  // Status tracking
  status: 'open' | 'seller_responded' | 'under_review' | 'resolved' | 'closed'

  // Evidence from buyer
  buyerEvidence: {
    description: string
    photos: string[] // mediaIds
    submittedAt: Date
  }

  // Evidence from seller (48-hour window to respond)
  sellerEvidence?: {
    description: string
    photos: string[] // mediaIds
    trackingNumber?: string
    submittedAt: Date
  }

  // Resolution timeline
  resolutionDeadline: Date // 48 hours from filing
  sellerRespondedAt?: Date

  // Outcome
  resolvedBy?: 'buyer_won' | 'seller_won' | 'partial_refund' | 'mutual_agreement'
  resolution?: {
    action: 'full_refund' | 'partial_refund' | 'replacement' | 'no_action'
    amount?: number // Refund amount
    reason: string
    decidedBy: 'admin' | 'automated' | 'seller_offer_accepted'
    decidedAt: Date
  }

  // Admin notes (internal only)
  adminNotes?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  closedAt?: Date
}

/**
 * Featured Placement System
 */
export interface FeaturedPlacement {
  id: string
  tenantId: string
  productId?: string // Specific product (null = seller profile featured)

  // Placement type
  placement: 'homepage_hero' | 'category_featured' | 'search_sponsored'

  // Schedule
  startDate: Date
  endDate: Date

  // Performance tracking
  impressions: number
  clicks: number
  sales: number
  revenue: number

  // Cost (paid feature for Business tier)
  cost: number // Amount paid
  currency: string

  // Status
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Tenant Marketplace Stats (cached aggregates)
 */
export interface TenantMarketplaceStats {
  tenantId: string

  // Traffic sources
  marketplaceViews: number // Views from marketplace browsing
  directViews: number // Views from direct store URL

  // Sales sources
  marketplaceSales: number // Number of sales from marketplace
  directSales: number // Number of sales from direct store

  // Revenue sources
  marketplaceRevenue: number // $ from marketplace
  directRevenue: number // $ from direct store

  // Product stats
  totalProductsListed: number
  approvedProducts: number
  pendingProducts: number

  // Review stats
  avgRating: number
  totalReviews: number
  fiveStarReviews: number
  fourStarReviews: number
  threeStarReviews: number
  twoStarReviews: number
  oneStarReviews: number

  // Customer stats
  totalCustomers: number
  repeatCustomers: number
  repeatCustomerRate: number // %

  // Response metrics
  avgResponseTime: number // Hours
  responseRate: number // %

  // Delivery metrics
  onTimeDeliveryRate: number // %
  avgShippingTime: number // Days

  // Last activity
  lastMarketplaceSale?: Date
  lastDirectSale?: Date
  lastReview?: Date

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Global Marketplace Configuration (singleton)
 */
export interface MarketplaceConfig {
  id: 'global' // Always the same ID (singleton)

  // Categories
  categories: MarketplaceCategory[]

  // Featured content
  featuredSellers: string[] // Tenant IDs
  featuredProducts: string[] // Product IDs

  // Quality control
  requireManualApproval: boolean // Review products before listing
  autoRejectLowQuality: boolean // Auto-reject based on image quality
  minPhotosRequired: number // Minimum photos per product
  minDescriptionLength: number // Minimum description characters

  // Seller reputation
  minRatingForFeatured: number // Minimum avg rating for featured (e.g., 4.5)
  strikeLimit: number // Number of strikes before marketplace ban (default: 3)

  // Review moderation
  autoPublishReviews: boolean // Publish reviews immediately or review first
  minRatingForAutoPublish: number // Auto-publish if rating >= this (e.g., 3)

  // Search & discovery
  enabledCategories: string[] // Category slugs that are active
  trendingProducts: string[] // Manually curated trending products

  // Business settings (not user-facing)
  maintenanceMode: boolean // Disable marketplace temporarily
  allowNewSellers: boolean // Allow new sellers to join marketplace

  // Timestamps
  updatedAt: Date
}

/**
 * Helper types for filtering and querying
 */

export interface MarketplaceProductFilters {
  category?: string
  subcategory?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy?: 'recent' | 'popular' | 'price_low' | 'price_high' | 'rating' | 'bestseller'
  page: number
  limit: number
}

export interface MarketplaceSearchResult {
  products: any[] // ProductWithSeller[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  facets?: {
    categories: { category: string; count: number }[]
    priceRanges: { range: string; count: number }[]
    ratings: { rating: number; count: number }[]
  }
}

export interface ReviewSummary {
  avgRating: number
  totalReviews: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  verifiedPurchasePercentage: number
}

/**
 * Seller strikes/warnings system
 */
export interface SellerStrike {
  id: string
  tenantId: string
  reason: string
  severity: 'warning' | 'strike' | 'ban'
  issuedBy: 'system' | 'admin'
  issuedAt: Date
  expiresAt?: Date // Strikes may expire after 6 months
  active: boolean
}

/**
 * Categories predefined (can be seeded in database)
 */
export const MARKETPLACE_CATEGORIES = [
  {
    id: 'art-prints',
    name: 'Art & Prints',
    slug: 'art-prints',
    icon: 'palette',
    subcategories: ['paintings', 'digital-art', 'prints', 'posters', 'wall-art', 'illustrations'],
  },
  {
    id: 'jewelry',
    name: 'Jewelry & Accessories',
    slug: 'jewelry',
    icon: 'gem',
    subcategories: ['necklaces', 'earrings', 'rings', 'bracelets', 'custom-jewelry', 'watches'],
  },
  {
    id: 'clothing',
    name: 'Clothing & Apparel',
    slug: 'clothing',
    icon: 'shirt',
    subcategories: ['tops', 'bottoms', 'dresses', 'outerwear', 'screen-prints', 'embroidery'],
  },
  {
    id: 'home-decor',
    name: 'Home & Living',
    slug: 'home-decor',
    icon: 'home',
    subcategories: ['candles', 'pottery', 'textiles', 'woodwork', 'furniture', 'lighting'],
  },
  {
    id: 'crafts',
    name: 'Crafts & Stationery',
    slug: 'crafts',
    icon: 'scissors',
    subcategories: ['stickers', 'cards', 'notebooks', 'paper-goods', 'scrapbooking', 'stamps'],
  },
  {
    id: 'accessories',
    name: 'Bags & Accessories',
    slug: 'accessories',
    icon: 'bag',
    subcategories: ['bags', 'purses', 'wallets', 'scarves', 'hats', 'gloves'],
  },
  {
    id: 'digital',
    name: 'Digital Products',
    slug: 'digital',
    icon: 'download',
    subcategories: ['printables', 'templates', 'fonts', 'graphics', 'photography', 'courses'],
  },
  {
    id: 'beauty',
    name: 'Beauty & Wellness',
    slug: 'beauty',
    icon: 'sparkles',
    subcategories: ['skincare', 'soaps', 'bath-products', 'aromatherapy', 'cosmetics', 'wellness'],
  },
  {
    id: 'toys-games',
    name: 'Toys & Games',
    slug: 'toys-games',
    icon: 'puzzle',
    subcategories: ['plushies', 'wooden-toys', 'educational', 'puzzles', 'games', 'dolls'],
  },
  {
    id: 'books-zines',
    name: 'Books & Publications',
    slug: 'books-zines',
    icon: 'book',
    subcategories: ['zines', 'comics', 'poetry', 'journals', 'self-published', 'art-books'],
  },
] as const
