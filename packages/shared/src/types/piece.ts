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
