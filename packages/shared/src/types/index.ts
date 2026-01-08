/**
 * MadeBuy Shared Types
 * Central type definitions for the entire platform
 *
 * ARCHIVED (2026-01-02): marketplace, transaction, payout, shipping, review,
 * wishlist, promotion, analytics, accountingConnection, emailCampaign
 * See: archive/packages/shared/src/types/
 */

// Export active types
export * from './tenant'
export * from './piece'
export * from './product'
export * from './media'
export * from './material'
export * from './invoice'
export * from './order'
export * from './publish'
export * from './enquiry'
export * from './blog'
export * from './tracking'
export * from './download'
export * from './customer'
export * from './discount'
export * from './newsletter'
export * from './collection'
export * from './keyDates'
export * from './payment'
export * from './template'
export * from './transaction'
export * from './payout'
export * from './scanner'
export * from './review'
export * from './wishlist'

// Re-export commonly used types for convenience
export type {
  Tenant,
  SocialConnection,
  SocialPlatform,
  TenantFeatures,
  OnboardingStep,
  SendleSettings,
  TenantTaxSettings,
  BusinessAddress,
} from './tenant'

export type {
  Piece,
  PieceStatus,
  PieceWithMedia,
  CreatePieceInput,
  UpdatePieceInput,
  PieceFilters,
  PieceIntegrations,
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
  Customer,
  CustomerAddress,
  CustomerSegment,
  SegmentRule,
  CustomerFilters,
  CustomerListOptions,
  CustomerStats,
  CustomerLTV,
  CohortData,
  CustomerWithOrders,
  CreateCustomerInput,
  UpdateCustomerInput,
  RegisterCustomerInput,
  CustomerAuthResult,
} from './customer'

export type {
  DiscountCode,
  DiscountType,
  CreateDiscountCodeInput,
  UpdateDiscountCodeInput,
  DiscountValidationResult,
  DiscountListOptions,
  DiscountStats,
} from './discount'

export type {
  DownloadRecord,
  DownloadEvent,
  DownloadValidationResult,
  DownloadFilters,
  DownloadStats,
  CreateDownloadRecordInput,
} from './download'

export type {
  PaymentProvider,
  PaymentMethod,
  StripeConnectStatus,
  StripeConnectRequirements,
  PayPalConnectStatus,
  TenantPaymentConfig,
  CreateStripeConnectInput,
  StripeOnboardingResponse,
  StripeDashboardResponse,
  CreatePayPalConnectInput,
  PayPalReferralResponse,
  CheckoutPaymentInfo,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
} from './payment'

export type {
  WebsiteTemplate,
  TemplateDefinition,
  PageType,
  WebsitePage,
  PageSectionType,
  PageSection,
  PageSectionSettings,
  HeroSlide,
  FeatureItem,
  TestimonialItem,
  FAQItem,
  HeaderConfig,
  FooterConfig,
  NavLink,
  FooterColumn,
} from './template'

export {
  TEMPLATE_DEFINITIONS,
  STANDARD_PAGE_SLUGS,
  LAYOUT_TO_TEMPLATE_MAP,
  getDefaultPages,
  getDefaultSections,
  generateSectionId,
  generatePageId,
  createCustomPage,
  validatePageSlug,
  migrateSectionsToPages,
} from './template'

export type {
  Transaction,
  TransactionType,
  TransactionStatus,
  CreateTransactionInput,
  TransactionFilters,
  TransactionListOptions,
  TenantBalance,
  TransactionSummary,
  QuarterlyGSTReport,
} from './transaction'

export {
  calculateStripeFee,
  calculateGstFromInclusive,
  calculateGstFromExclusive,
  getExclusiveAmount,
  parseQuarter,
  getCurrentQuarter,
} from './transaction'

export type {
  Payout,
  PayoutStatus,
  CreatePayoutInput,
  PayoutFilters,
  PayoutListOptions,
  PayoutSummary,
} from './payout'

export type {
  ExtractedDesign,
  DesignImportState,
  DesignImportStatus,
  DomainOnboardingState,
  DomainOnboardingStatus,
  DnsRecord,
  NavItem,
  NavStructure,
  SectionType,
  DetectedSection,
  TemplateRecommendation,
  PreviewConfig,
} from './scanner'

export type {
  Review,
  ReviewStatus,
  ReviewPhoto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilters,
  ReviewListOptions,
  ProductReviewStats,
  ReviewModerationInput,
} from './review'

// =============================================================================
// ARCHIVED TYPES (removed 2026-01-02)
// =============================================================================
// marketplace - see archive/packages/shared/src/types/
// shipping - see archive/packages/shared/src/types/
// review - see archive/packages/shared/src/types/
// wishlist - see archive/packages/shared/src/types/
// promotion - see archive/packages/shared/src/types/
// analytics - see archive/packages/shared/src/types/
// accountingConnection - see archive/packages/shared/src/types/
// emailCampaign - see archive/packages/shared/src/types/

// ShippingMethod stub - was in archived shipping.ts
export interface ShippingMethod {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  estimatedDays: { min: number; max: number }
  countries: string[]
  enabled: boolean
}
