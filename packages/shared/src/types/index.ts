/**
 * MadeBuy Shared Types
 * Central type definitions for the entire platform
 */

// Export all types
export * from './tenant'
export * from './piece'
export * from './product'
export * from './marketplace'
export * from './media'
export * from './material'
export * from './invoice'
export * from './order'
export * from './promotion'
export * from './publish'
export * from './enquiry'
export * from './blog'

// Re-export commonly used types for convenience
export type {
  Tenant,
  SocialConnection,
  SocialPlatform,
  TenantFeatures,
  TenantIntegrations,
  EtsyIntegration,
} from './tenant'

export type {
  Piece,
  PieceStatus,
  PieceWithMedia,
  CreatePieceInput,
  UpdatePieceInput,
  PieceFilters,
  PieceIntegrations,
  EtsyListingIntegration,
} from './piece'

export type {
  MediaItem,
  MediaType,
  MediaVariant,
  MediaVariants,
  CreateMediaInput,
  UpdateMediaInput,
} from './media'

export type {
  Material,
  MaterialCategory,
  MaterialUnit,
  MaterialUsage,
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialFilters,
} from './material'

export type {
  InvoiceRecord,
  InvoiceLineItem,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilters,
} from './invoice'

export type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  CreateOrderInput,
} from './order'

export type {
  Promotion,
  PromotionType,
  CreatePromotionInput,
} from './promotion'

export type {
  PublishRecord,
  PublishStatus,
  PlatformResult,
  AICaptionRequest,
  AICaptionResponse,
} from './publish'

export type {
  Enquiry,
  EnquiryStatus,
  CreateEnquiryInput,
} from './enquiry'

export type {
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  BlogConfig,
  BlogPublishConfig,
} from './blog'

// Re-export marketplace constants
export { MARKETPLACE_CATEGORIES } from './marketplace'

export type {
  Product,
  ProductStatus,
  ProductAttributes,
  ProductWithMedia,
  ProductWithSeller,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  ProductIntegrations,
  EtsyListingIntegration as EtsyProductIntegration,
  SellerBadge,
} from './product'
