/**
 * Piece - Product/inventory item
 */

import type { MediaItem } from './media'
import type { SocialVideo } from './product'

export interface Piece {
  id: string
  tenantId: string

  name: string
  slug: string // URL-safe version
  description?: string

  // Materials (generic for all maker types)
  materials: string[] // Generic materials list (replaces stones/metals)
  techniques: string[] // Techniques/methods used (applies to all makers)

  // DEPRECATED: Legacy jewelry-specific fields (kept for migration)
  // These will be combined into 'materials' during migration
  stones?: string[]
  metals?: string[]

  // Details
  dimensions?: string
  weight?: string
  chainLength?: string

  // Pricing
  price?: number
  currency: string
  cogs?: number // Cost of Goods Sold (calculated from material usages)

  // Inventory
  stock?: number // Quantity available. Undefined = unlimited stock

  // Variants (optional - for products with size/color/etc options)
  hasVariants?: boolean
  variantOptions?: VariantOption[] // e.g., [{name: "Size", values: ["S", "M", "L"]}]
  variants?: ProductVariant[] // Individual variant combinations with stock/price

  // Variations (enhanced variant system with SKU combinations)
  variations?: ProductVariation[]
  hasVariations?: boolean

  // Personalization
  personalizationEnabled?: boolean
  personalizationFields?: PersonalizationField[]

  // Digital product
  isDigital?: boolean
  digitalFiles?: DigitalFile[]

  // Status
  status: PieceStatus

  // Media
  mediaIds: string[]
  primaryMediaId?: string

  // Social Videos (for embedding on shop page)
  socialVideos?: SocialVideo[]

  // Marketplace integrations
  integrations?: PieceIntegrations

  // Display
  isFeatured: boolean
  category: string // Customizable per tenant
  tags: string[]

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

export type PieceStatus = 'draft' | 'available' | 'reserved' | 'sold'

/**
 * Variant Option - defines a single option type (e.g., Size, Color)
 */
export interface VariantOption {
  name: string // e.g., "Size", "Color", "Material"
  values: string[] // e.g., ["S", "M", "L"] or ["Red", "Blue", "Green"]
}

/**
 * Product Variant - a specific combination of options with its own stock/price
 */
export interface ProductVariant {
  id: string
  options: Record<string, string> // e.g., { "Size": "M", "Color": "Red" }
  sku?: string
  price?: number // Override base price (if different from parent)
  stock?: number // Variant-specific stock
  isAvailable: boolean
}

/**
 * ProductVariation - defines a variation type (e.g., Size, Color)
 */
export interface ProductVariation {
  id: string
  name: string // e.g., "Size", "Color"
  options: VariationOption[]
}

/**
 * VariationOption - a single option within a variation type
 */
export interface VariationOption {
  id: string
  value: string // e.g., "Small", "Red"
  priceAdjustment?: number // +/- cents from base price
  sku?: string // SKU suffix for this option
  stock?: number // Stock for this specific option
  mediaId?: string // Show different image for this option
}

/**
 * VariantCombination - a specific combination of variation options with its own SKU/price/stock
 */
export interface VariantCombination {
  id: string
  pieceId: string
  options: Record<string, string> // { "Size": "Small", "Color": "Red" }
  sku: string
  price: number // Final price in cents
  stock: number
  mediaId?: string
}

/**
 * PersonalizationField - defines a field for customer personalization
 */
export interface PersonalizationField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'file'
  required: boolean
  maxLength?: number
  options?: string[] // For select type
  placeholder?: string
}

/**
 * DigitalFile - a digital file attached to a product
 */
export interface DigitalFile {
  id: string
  name: string
  size: number // Size in bytes
  mimeType: string
  r2Key: string // Cloudflare R2 storage key
  downloadCount?: number
}

// Social Video Embeds - imported from product.ts to avoid duplication

export interface EtsyListingIntegration {
  listingId: string
  listingUrl: string
  state: 'draft' | 'active' | 'inactive' | 'sold_out' | 'expired'
  lastSyncedAt: Date
  etsyQuantity: number
  syncEnabled: boolean
}

export interface PieceIntegrations {
  etsy?: EtsyListingIntegration
}

export interface CreatePieceInput {
  name: string
  description?: string
  materials?: string[] // Generic materials (replaces stones/metals)
  techniques?: string[]
  dimensions?: string
  weight?: string
  chainLength?: string
  price?: number
  currency?: string
  stock?: number
  category?: string
  tags?: string[]
  status?: PieceStatus
  isFeatured?: boolean
  // Variants (legacy)
  hasVariants?: boolean
  variantOptions?: VariantOption[]
  variants?: Omit<ProductVariant, 'id'>[] // IDs will be generated on creation
  // Variations (enhanced variant system)
  hasVariations?: boolean
  variations?: Omit<ProductVariation, 'id'>[]
  // Personalization
  personalizationEnabled?: boolean
  personalizationFields?: Omit<PersonalizationField, 'id'>[]
  // Digital product
  isDigital?: boolean
  digitalFiles?: Omit<DigitalFile, 'id'>[]
  // DEPRECATED: Legacy fields for backward compatibility
  stones?: string[]
  metals?: string[]
}

export interface UpdatePieceInput extends Partial<CreatePieceInput> {
  status?: PieceStatus
  isFeatured?: boolean
  mediaIds?: string[]
  primaryMediaId?: string
  socialVideoUrls?: string[] // Raw URLs from form
  isPublishedToWebsite?: boolean
  websiteSlug?: string
  soldTo?: Piece['soldTo']
}

export interface PieceFilters {
  status?: PieceStatus | PieceStatus[]
  category?: string | string[]
  tags?: string[]
  isFeatured?: boolean
  isPublishedToWebsite?: boolean
  search?: string
  minPrice?: number
  maxPrice?: number
}

export interface PieceListOptions extends PieceFilters {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name'
  sortOrder?: 'asc' | 'desc'
}

/**
 * PieceWithMedia - Piece with populated media objects
 * Used in web app for displaying pieces with images
 */
export interface PieceWithMedia extends Piece {
  primaryImage?: MediaItem
  allImages: MediaItem[]
  // Note: materials is now native to Piece interface
}
