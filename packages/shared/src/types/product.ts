/**
 * Product - Generic product/inventory item for all maker categories
 * Replaces jewelry-specific Piece type with flexible attributes model
 */

import type { MediaItem } from './media'

export interface Product {
  id: string
  tenantId: string

  name: string
  slug: string // URL-safe version
  description?: string

  // Generic categorization (supports ALL product types)
  category: string // "jewelry", "art", "clothing", "home-decor", etc.
  subcategory?: string // "necklaces", "paintings", "t-shirts", etc.
  tags: string[]

  // Flexible attributes - product-type specific fields
  attributes: ProductAttributes

  // Pricing
  price?: number
  currency: string
  cogs?: number // Cost of Goods Sold (calculated from material usages)

  // Inventory
  stock?: number // Quantity available. Undefined = unlimited stock

  // Status
  status: ProductStatus

  // Media
  mediaIds: string[]
  primaryMediaId?: string

  // Social Videos (for embedding on shop page)
  socialVideos?: SocialVideo[]

  // Marketplace integrations (Etsy, Shopify, etc.)
  integrations?: ProductIntegrations

  // Marketplace listing (NEW for unified marketplace)
  marketplace: MarketplaceFields

  // Display
  isFeatured: boolean

  // Publishing
  isPublishedToWebsite: boolean
  websiteSlug?: string

  // Analytics
  viewCount?: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
  soldAt?: Date

  // Customer info (if sold)
  soldTo?: {
    name?: string
    email?: string
    note?: string
  }
}

export type ProductStatus = 'draft' | 'available' | 'reserved' | 'sold'

/**
 * Flexible attributes for any product type
 * Jewelry-specific fields moved here, with support for other categories
 */
export type ProductAttributes = {
  // === JEWELRY ===
  stones?: string[] // Gemstones used
  metals?: string[] // Metals used
  techniques?: string[] // Crafting techniques
  chainLength?: string // Chain length
  ringSize?: string // Ring size
  dimensions?: string // Physical dimensions
  weight?: string // Weight

  // === ART & PRINTS ===
  medium?: string // "oil", "watercolor", "digital", "photography"
  artDimensions?: {
    width: number
    height: number
    depth?: number
    unit: 'in' | 'cm' | 'mm'
  }
  framed?: boolean
  signed?: boolean
  edition?: {
    number: number // Print number
    total: number // Total prints
  }
  orientation?: 'portrait' | 'landscape' | 'square'

  // === CLOTHING & APPAREL ===
  sizes?: string[] // ["XS", "S", "M", "L", "XL"]
  colors?: string[] // Available colors
  material?: string // Fabric material
  careInstructions?: string
  fit?: 'slim' | 'regular' | 'relaxed' | 'oversized'
  gender?: 'men' | 'women' | 'unisex' | 'kids'

  // === HOME DECOR ===
  roomType?: string[] // ["bedroom", "living-room", "kitchen"]
  style?: string // "modern", "rustic", "bohemian"
  primaryMaterial?: string // Wood, ceramic, glass, etc.
  careAndCleaning?: string

  // === DIGITAL PRODUCTS ===
  fileFormat?: string // "PDF", "PNG", "SVG", "PSD"
  fileSize?: string // "2.5 MB"
  downloadType?: 'instant' | 'email'
  license?: 'personal' | 'commercial' | 'extended'
  compatibility?: string // "Photoshop CS6+", "Canva", etc.

  // === BEAUTY & WELLNESS ===
  ingredients?: string[]
  scent?: string
  skinType?: string[] // ["dry", "oily", "sensitive"]
  volume?: string // "4 oz", "120 ml"
  expiration?: string // "12 months after opening"

  // === CRAFT SUPPLIES ===
  quantity?: number // Number of items in pack
  toolsRequired?: string[]
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'

  // Extensible for any custom attributes
  [key: string]: any
}

/**
 * Marketplace-specific fields for unified marketplace
 */
export interface MarketplaceFields {
  // Opt-in per product
  listed: boolean

  // Marketplace categories (can differ from product.category)
  // Examples: ["art", "wall-art", "abstract"]
  categories: string[]

  // Approval workflow
  approvalStatus: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  approvedAt?: Date

  // Analytics
  marketplaceViews: number
  marketplaceSales: number

  // Reviews & Ratings
  avgRating: number // 0-5
  totalReviews: number

  // Featured placement
  featuredUntil?: Date // Featured expiration date
  featuredPlacement?: 'homepage_hero' | 'category_featured' | 'search_sponsored'

  // Quality score (for ranking)
  qualityScore?: number // 0-100, based on photos, description, reviews

  // Last listed timestamp
  listedAt?: Date
}

// Social Video Embeds (for displaying social content on shop page)
export interface SocialVideo {
  platform: 'tiktok' | 'instagram' | 'youtube'
  url: string // Original URL
  embedUrl: string // Embed URL for iframe
  videoId?: string // Platform-specific video ID
}

/**
 * Marketplace integrations (Etsy, Shopify, etc.)
 */
export interface ProductIntegrations {
  etsy?: EtsyListingIntegration
  shopify?: ShopifyProductIntegration
  // Future: amazon, ebay, etc.
}

export interface EtsyListingIntegration {
  listingId: string
  listingUrl: string
  state: 'draft' | 'active' | 'inactive' | 'sold_out' | 'expired'
  lastSyncedAt: Date
  etsyQuantity: number
  syncEnabled: boolean
}

export interface ShopifyProductIntegration {
  productId: string
  productUrl: string
  status: 'active' | 'draft' | 'archived'
  lastSyncedAt: Date
  shopifyInventory: number
  syncEnabled: boolean
}

// === INPUT/UPDATE TYPES ===

export interface CreateProductInput {
  name: string
  description?: string

  // Category
  category: string
  subcategory?: string
  tags?: string[]

  // Flexible attributes
  attributes?: Partial<ProductAttributes>

  // Pricing
  price?: number
  currency?: string
  stock?: number

  // Status
  status?: ProductStatus
  isFeatured?: boolean

  // Marketplace (defaults to not listed)
  marketplaceListed?: boolean
  marketplaceCategories?: string[]
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  status?: ProductStatus
  isFeatured?: boolean
  mediaIds?: string[]
  primaryMediaId?: string
  socialVideoUrls?: string[] // Raw URLs from form
  isPublishedToWebsite?: boolean
  websiteSlug?: string
  soldTo?: Product['soldTo']

  // Marketplace updates
  marketplaceListed?: boolean
  marketplaceCategories?: string[]
}

export interface ProductFilters {
  status?: ProductStatus | ProductStatus[]
  category?: string | string[]
  subcategory?: string | string[]
  tags?: string[]
  isFeatured?: boolean
  isPublishedToWebsite?: boolean
  search?: string
  minPrice?: number
  maxPrice?: number

  // Marketplace filters
  marketplaceListed?: boolean
  marketplaceApproved?: boolean
  marketplaceCategories?: string[]
}

export interface ProductListOptions extends ProductFilters {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name' | 'marketplaceRating'
  sortOrder?: 'asc' | 'desc'
}

/**
 * ProductWithMedia - Product with populated media objects
 * Used in web app for displaying products with images
 */
export interface ProductWithMedia extends Product {
  primaryImage?: MediaItem
  allImages: MediaItem[]
}

/**
 * ProductWithSeller - Product with seller/tenant info
 * Used in marketplace for cross-tenant product browsing
 */
export interface ProductWithSeller extends ProductWithMedia {
  seller: {
    tenantId: string
    displayName: string
    businessName?: string
    avatar?: string
    location?: string
    avgRating: number
    totalReviews: number
    badges: SellerBadge[]
    memberSince: Date
  }
}

export type SellerBadge =
  | 'verified' // Email verified
  | 'top_seller' // High sales/ratings
  | 'responsive' // Fast response time
  | 'new_seller' // < 30 days
  | 'eco_friendly' // Sustainable practices
  | 'handmade_verified' // Verified handmade
  | 'fast_shipper' // Ships within 1-2 business days
  | 'rising_star' // New seller with high potential
