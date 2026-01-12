/**
 * Piece - Product/inventory item
 */

import type { MediaItem } from './media'
import type { SocialVideo } from './product'

/**
 * PieceMaterialUsage - Tracks materials used in a piece for COGS calculation
 * Different from MaterialUsage in material.ts which is for historical tracking records
 */
export interface PieceMaterialUsage {
  materialId: string     // Reference to Material.id
  quantity: number       // Amount used
  unit: string          // Unit of measurement (should match material's unit)
}

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

  // Details (legacy free-form text)
  dimensions?: string
  weight?: string
  chainLength?: string

  // Shipping dimensions (structured for carrier API integration)
  shippingWeight?: number  // Weight in grams
  shippingLength?: number  // Length in cm
  shippingWidth?: number   // Width in cm
  shippingHeight?: number  // Height in cm

  // Pricing
  price?: number
  currency: string

  // COGS (Cost of Goods Sold)
  materialsUsed?: PieceMaterialUsage[]  // Materials used in this piece
  calculatedCOGS?: number               // Total cost in cents, calculated from materialsUsed
  profitMargin?: number                 // Percentage profit margin ((price - COGS) / price * 100)

  // DEPRECATED: Legacy COGS field, use calculatedCOGS instead
  cogs?: number // Cost of Goods Sold (calculated from material usages)

  // Inventory
  stock?: number // Quantity available. Undefined = unlimited stock
  lowStockThreshold?: number // Alert when stock falls to or below this level

  // Variants (optional - for products with size/color/etc options)
  hasVariants?: boolean
  variantAttributes?: VariantAttribute[] // Enhanced: attribute definitions (e.g., Size, Color)
  variantOptions?: VariantOption[] // DEPRECATED: Use variantAttributes instead
  variants?: ProductVariant[] // Individual variant combinations with stock/price

  // Variations (enhanced variant system with SKU combinations)
  variations?: ProductVariation[]
  hasVariations?: boolean

  // Personalization (for custom/made-to-order products)
  personalization?: PersonalizationConfig

  // DEPRECATED: Legacy personalization fields, use personalization.enabled/fields instead
  personalizationEnabled?: boolean
  personalizationFields?: PersonalizationField[]

  // Digital product configuration
  digital?: DigitalProductConfig

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

  // Reviews (populated by review moderation)
  avgRating?: number       // Average rating 0-5
  reviewCount?: number     // Total approved reviews

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
 * DEPRECATED: Use EnhancedProductVariant for new implementations
 */
export interface ProductVariant {
  id: string
  options: Record<string, string> // e.g., { "Size": "M", "Color": "Red" }
  sku?: string
  price?: number // Override base price (if different from parent)
  stock?: number // Variant-specific stock
  isAvailable: boolean
}

// ============================================================================
// ENHANCED VARIANT SYSTEM TYPES (New Implementation)
// ============================================================================

/**
 * VariantAttribute - Defines a single attribute type for variants
 * Examples: "Size", "Color", "Material"
 */
export interface VariantAttribute {
  /** Attribute name (e.g., "Size", "Color", "Material") */
  name: string
  /** Possible values for this attribute (e.g., ["S", "M", "L"] or ["Red", "Blue"]) */
  values: string[]
  /** Display order in the UI (lower numbers appear first) */
  displayOrder: number
}

/**
 * EnhancedProductVariant - A specific combination of variant attributes with its own inventory
 * Represents one purchasable SKU (e.g., "Medium Blue T-Shirt")
 * Stored in variant_combinations collection with full metadata
 */
export interface EnhancedProductVariant {
  /** Unique identifier (nanoid) */
  id: string
  /** Parent piece ID */
  pieceId: string
  /** Stock Keeping Unit - unique within tenant */
  sku: string
  /** Attribute combinations for this variant (e.g., { Size: "M", Color: "Blue" }) */
  attributes: Record<string, string>
  /** Price in cents (null = use base piece price) */
  price: number | null
  /** Original price for displaying sales/discounts in cents */
  compareAtPrice?: number | null
  /** Current stock quantity (>= 0) */
  stock: number
  /** Alert when stock falls to or below this threshold */
  lowStockThreshold?: number | null
  /** Whether this variant can be purchased */
  isAvailable: boolean
  /** Weight in grams for shipping calculations */
  weight?: number | null
  /** Barcode (UPC/EAN/ISBN) */
  barcode?: string | null
  /** Link to specific media for this variant */
  imageId?: string | null
  /** Soft delete flag */
  isDeleted?: boolean
  /** When this variant was created */
  createdAt: Date
  /** When this variant was last updated */
  updatedAt: Date
}

/**
 * CreateVariantInput - Input for creating a new variant
 */
export interface CreateVariantInput {
  /** Stock Keeping Unit - must be unique within tenant (3-50 chars, alphanumeric + dashes) */
  sku: string
  /** Attribute combinations (e.g., { Size: "M", Color: "Blue" }) */
  attributes: Record<string, string>
  /** Price in cents (optional, null = use base price) */
  price?: number | null
  /** Compare at price in cents (optional) */
  compareAtPrice?: number | null
  /** Initial stock quantity (required, must be >= 0) */
  stock: number
  /** Low stock alert threshold (optional) */
  lowStockThreshold?: number | null
  /** Whether available for purchase (defaults to true) */
  isAvailable?: boolean
  /** Weight in grams (optional) */
  weight?: number | null
  /** Barcode (optional) */
  barcode?: string | null
  /** Media ID for variant-specific image (optional) */
  imageId?: string | null
}

/**
 * UpdateVariantInput - Input for updating an existing variant
 */
export interface UpdateVariantInput {
  sku?: string
  attributes?: Record<string, string>
  price?: number | null
  compareAtPrice?: number | null
  stock?: number
  lowStockThreshold?: number | null
  isAvailable?: boolean
  weight?: number | null
  barcode?: string | null
  imageId?: string | null
}

/**
 * BulkStockUpdateItem - Single item for bulk stock updates
 */
export interface BulkStockUpdateItem {
  variantId: string
  stock: number
}

/**
 * BulkCreateVariantsInput - Input for bulk variant creation
 */
export interface BulkCreateVariantsInput {
  variants: CreateVariantInput[]
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

// ============================================================================
// PERSONALIZATION SYSTEM TYPES
// ============================================================================

/**
 * Personalization field types
 */
export type PersonalizationFieldType =
  | 'text'      // Single line text input
  | 'textarea'  // Multi-line text input
  | 'select'    // Dropdown selection
  | 'checkbox'  // Yes/No toggle
  | 'file'      // Image/file upload
  | 'date'      // Date picker (delivery date, event date)
  | 'number'    // Numeric input (quantity, measurements)

/**
 * PersonalizationField - defines a field for customer personalization
 */
export interface PersonalizationField {
  id: string
  name: string                           // Display name: "Engraving Text", "Gift Message"
  type: PersonalizationFieldType
  required: boolean
  placeholder?: string                   // Placeholder text for input
  helpText?: string                      // Instructions for buyer

  // Text validation constraints
  minLength?: number
  maxLength?: number
  pattern?: string                       // Regex pattern for validation
  patternError?: string                  // Custom error message for pattern mismatch

  // Select type options
  options?: string[]                     // Available choices for select type

  // Number type constraints
  min?: number
  max?: number
  step?: number                          // Step increment for number input

  // File type constraints
  acceptedFileTypes?: string[]           // MIME types: ["image/png", "image/jpeg"]
  maxFileSizeMB?: number                 // Max file size in megabytes

  // Date type constraints
  minDate?: string                       // ISO date string for minimum date
  maxDate?: string                       // ISO date string for maximum date

  // Pricing impact
  priceAdjustment?: number               // Additional cost for this field/option (cents)
  priceAdjustmentType?: 'fixed' | 'percentage'

  // Display order in form
  displayOrder: number

  // DEPRECATED: Keep for backwards compatibility
  label?: string                         // Old field name, use 'name' instead
}

/**
 * Personalization configuration for a piece
 */
export interface PersonalizationConfig {
  enabled: boolean
  fields: PersonalizationField[]
  previewEnabled?: boolean               // Show live preview to buyer
  processingDays?: number                // Extra days needed for personalized items
  instructions?: string                  // General instructions displayed at top of form
}

/**
 * PersonalizationValue - stored value for a personalization field in an order
 */
export interface PersonalizationValue {
  fieldId: string
  fieldName: string
  value: string | number | boolean
  fileUrl?: string                       // For file type fields
  fileName?: string                      // Original filename for file uploads
  priceAdjustment: number                // Calculated price adjustment in cents
}

/**
 * DigitalFile - a digital file attached to a product
 */
export interface DigitalFile {
  id: string
  name: string                      // Display name
  fileName: string                  // Original filename
  r2Key: string                     // Cloudflare R2 storage key
  sizeBytes: number                 // Size in bytes
  mimeType: string
  description?: string              // What this file contains
  version?: string                  // v1.0, v2.0 for updates
  sortOrder: number                 // Display order
  createdAt: Date
  updatedAt: Date
}

/**
 * DigitalProductConfig - configuration for digital product delivery
 */
export interface DigitalProductConfig {
  isDigital: boolean
  files: DigitalFile[]

  // Download settings
  downloadLimit?: number            // Max downloads per purchase (null = unlimited)
  downloadExpiryDays?: number       // Days until link expires (null = never)

  // Delivery
  instantDelivery: boolean          // Deliver immediately after payment
  emailDelivery: boolean            // Send download link via email

  // Terms
  licenseType?: 'personal' | 'commercial' | 'extended'
  licenseText?: string              // Custom license terms
}

/**
 * CreateDigitalFileInput - input for creating a digital file record
 */
export interface CreateDigitalFileInput {
  name: string
  fileName: string
  r2Key: string
  sizeBytes: number
  mimeType: string
  description?: string
  version?: string
}

/**
 * UpdateDigitalFileInput - input for updating a digital file record
 */
export interface UpdateDigitalFileInput {
  name?: string
  description?: string
  version?: string
  sortOrder?: number
}

// External integrations archived (2026-01-02)
export interface PieceIntegrations {
  // Reserved for future integrations
}

export interface CreatePieceInput {
  name: string
  description?: string
  materials?: string[] // Generic materials (replaces stones/metals)
  techniques?: string[]
  dimensions?: string
  weight?: string
  chainLength?: string
  // Shipping dimensions
  shippingWeight?: number
  shippingLength?: number
  shippingWidth?: number
  shippingHeight?: number
  price?: number
  currency?: string
  // COGS tracking
  materialsUsed?: PieceMaterialUsage[]  // Materials used for COGS calculation
  stock?: number
  lowStockThreshold?: number
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
  digital?: Omit<DigitalProductConfig, 'files'> & {
    files?: CreateDigitalFileInput[]
  }
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
  slug?: string // For overriding auto-generated slug (e.g., during import)
  soldTo?: Piece['soldTo']
  personalization?: PersonalizationConfig
  digital?: DigitalProductConfig
  variantAttributes?: VariantAttribute[]
  // COGS tracking (explicit for clarity)
  materialsUsed?: PieceMaterialUsage[]
  calculatedCOGS?: number
  profitMargin?: number
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
