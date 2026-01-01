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
export * from './analytics'
export * from './tracking'
export * from './transaction'
export * from './payout'
export * from './download'

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
  VariantOption,
  ProductVariant,
  ProductVariation,
  VariationOption,
  VariantCombination,
  PersonalizationFieldType,
  PersonalizationField,
  PersonalizationConfig,
  PersonalizationValue,
  DigitalFile,
  DigitalProductConfig,
  CreateDigitalFileInput,
  UpdateDigitalFileInput,
} from './piece'

export type {
  MediaItem,
  MediaType,
  MediaVariant,
  MediaVariants,
  CreateMediaInput,
  UpdateMediaInput,
  VideoMetadata,
  VideoProcessingStatus,
  MediaFilters,
  MediaListOptions,
  ReorderMediaInput,
  ReorderResult,
} from './media'

export {
  VALID_IMAGE_TYPES,
  VALID_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  MAX_MEDIA_PER_PIECE,
  VIDEO_EXTENSIONS,
  IMAGE_EXTENSIONS,
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

export type {
  TrafficSource,
  TrackingEventType,
  TrackingEvent,
  DailyAnalytics,
  SourceStats,
  SourceAnalyticsSummary,
  TrackedLinks,
  AttributionData,
  UTMParams,
} from './tracking'

export type {
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionFees,
  CreateTransactionInput,
  TransactionFilters,
  TransactionSummary,
  DailyRevenueData,
} from './transaction'

export type {
  Payout,
  PayoutStatus,
  PayoutMethod,
  CreatePayoutInput,
  PayoutFilters,
  PayoutSummary,
  PayoutStats,
} from './payout'

export * from './customer'
export * from './emailCampaign'

export type {
  Customer,
  CustomerSegment,
  SegmentRule,
  CustomerFilters,
  CustomerStats,
  CustomerLTV,
  CohortData,
  CreateCustomerInput,
  UpdateCustomerInput,
} from './customer'

export type {
  EmailCampaign,
  EmailTrigger,
  EmailCampaignStatus,
  EmailCampaignStats,
  EmailSubscriber,
  EmailAutomation,
  AutomationCondition,
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
  EmailCampaignFilters,
  EmailMarketingStats,
} from './emailCampaign'

export * from './shipping'

export type {
  ShippingCarrier,
  ShippingProfile,
  WeightRate,
  Shipment,
  ShipmentStatus,
  ShipmentDimensions,
  SendleQuote,
  SendleOrder,
  SendleLabel,
  SendleContact,
  SendleTracking,
  SendleTrackingEvent,
  CreateShipmentInput,
  CreateLabelInput,
  ShippingProfileInput,
  SendleIntegration,
} from './shipping'

export * from './wishlist'
// Note: review.ts ReviewSummary conflicts with marketplace.ts - use explicit exports below
export type { Review, ReviewStatus, CreateReviewInput, UpdateReviewInput, ReviewFilters } from './review'
export * from './accountingConnection'

export type {
  WishlistItem,
  WishlistFilters,
  AddToWishlistInput,
} from './wishlist'

export type {
  ReviewSummary as BuyerReviewSummary,
} from './review'

export type {
  AccountingConnection,
  AccountingProvider,
  AccountingConnectionStatus,
  SyncStatus,
  AccountMappings,
  CreateAccountingConnectionInput,
  UpdateAccountingConnectionInput,
  UpdateSyncStatusInput,
} from './accountingConnection'

export type {
  DownloadRecord,
  DownloadEvent,
  DownloadValidationResult,
  DownloadFilters,
  DownloadStats,
  CreateDownloadRecordInput,
} from './download'
