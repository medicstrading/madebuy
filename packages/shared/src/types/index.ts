/**
 * MadeBuy Shared Types
 * Central type definitions for the entire platform
 *
 * ARCHIVED (2026-01-02): marketplace, transaction, payout, shipping, review,
 * wishlist, promotion, analytics, accountingConnection, emailCampaign
 * See: archive/packages/shared/src/types/
 */

// Platform Admin Types
export type {
  Admin,
  AdminRole,
  AdminSession,
  CreateAdminInput,
  ImpersonationToken,
  UpdateAdminInput,
} from './admin'
export * from './admin'

// Platform Analytics Types
export type {
  CollectionStats,
  ComponentHealth,
  DashboardAlert,
  DashboardSummary,
  ErrorStats,
  FeatureAdoption,
  MarketplaceStats,
  MongoStats,
  MRRBreakdown,
  MRRDataPoint,
  OrdersDataPoint,
  RevenueByTier,
  RevenueDataPoint,
  SignupDataPoint,
  SystemHealth,
  TenantCounts,
  TenantHealthScore,
  TenantsByPlan,
  TopProduct,
  TopSeller,
  WebhookStats,
} from './platformAnalytics'
export * from './platformAnalytics'

export type {
  BlogConfig,
  BlogPost,
  BlogPublishConfig,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from './blog'
export * from './blog'
export type {
  Bundle,
  BundleCartItem,
  BundleListOptions,
  BundlePiece,
  BundleStatus,
  BundleWithPieces,
  CreateBundleInput,
  UpdateBundleInput,
} from './bundle'
export * from './bundle'
export type {
  CallToActionStyle,
  CaptionStyleOptions,
  CaptionStyleProfile,
  CaptionTone,
  CreateCaptionStyleInput,
  EmojiUsage,
  ExamplePost,
  HashtagStyle,
  LearnedExample,
  LengthPreference,
  UpdateCaptionStyleInput,
} from './captionStyle'
export * from './captionStyle'
export {
  CTA_LABELS,
  EMOJI_USAGE_LABELS,
  HASHTAG_LABELS,
  LENGTH_LABELS,
  PLATFORM_DEFAULT_STYLES,
  PLATFORM_GUIDELINES,
  TONE_LABELS,
} from './captionStyle'
export * from './collection'
export type {
  CohortData,
  CreateCustomerInput,
  Customer,
  CustomerAddress,
  CustomerAuthResult,
  CustomerFilters,
  CustomerListOptions,
  CustomerLTV,
  CustomerSegment,
  CustomerStats,
  CustomerWithOrders,
  RegisterCustomerInput,
  SegmentRule,
  UpdateCustomerInput,
} from './customer'
export * from './customer'
export type {
  CreateDiscountCodeInput,
  DiscountCode,
  DiscountListOptions,
  DiscountStats,
  DiscountType,
  DiscountValidationResult,
  UpdateDiscountCodeInput,
} from './discount'
export * from './discount'
export type {
  CreateDisputeInput,
  Dispute,
  DisputeFilters,
  DisputeListOptions,
  DisputeReason,
  DisputeStats,
  DisputeStatus,
  UpdateDisputeInput,
} from './dispute'
export * from './dispute'
export type {
  CreateDownloadRecordInput,
  DownloadEvent,
  DownloadFilters,
  DownloadRecord,
  DownloadStats,
  DownloadValidationResult,
} from './download'
export * from './download'
export type {
  CreateEnquiryInput,
  Enquiry,
  EnquiryStatus,
} from './enquiry'
export * from './enquiry'
export * from './import'
export type {
  CreateInvoiceInput,
  InvoiceFilters,
  InvoiceLineItem,
  InvoiceRecord,
  UpdateInvoiceInput,
} from './invoice'
export * from './invoice'
export * from './keyDates'
export type {
  CreateMarketplaceConnectionInput,
  CreateMarketplaceListingInput,
  CreateMarketplaceOrderInput,
  EbayConfig,
  EtsyConfig,
  InventorySyncResult,
  ListingSyncResult,
  MarketplaceConnection,
  MarketplaceConnectionStatus,
  MarketplaceListing,
  MarketplaceListingFilters,
  MarketplaceListingStatus,
  MarketplaceOAuthConfig,
  MarketplaceOAuthState,
  MarketplaceOrder,
  MarketplaceOrderFilters,
  MarketplaceOrderItem,
  MarketplaceOrderStatus,
  MarketplacePlatform,
  MarketplaceTokenResponse,
  OrderImportResult,
  UpdateMarketplaceConnectionInput,
  UpdateMarketplaceListingInput,
} from './marketplace'
export * from './marketplace'
export {
  MARKETPLACE_FEATURES,
  MARKETPLACE_LABELS,
  MARKETPLACE_LISTING_STATUS_LABELS,
  MARKETPLACE_ORDER_STATUS_LABELS,
} from './marketplace'
export type {
  CreateMaterialInput,
  Material,
  MaterialCategory,
  MaterialFilters,
  MaterialUnit,
  MaterialUsage,
  UpdateMaterialInput,
} from './material'
export * from './material'
export type {
  CreateMediaInput,
  MediaFilters,
  MediaItem,
  MediaListOptions,
  MediaType,
  MediaVariant,
  MediaVariants,
  ReorderMediaInput,
  ReorderResult,
  UpdateMediaInput,
  VideoMetadata,
  VideoProcessingStatus,
} from './media'
export * from './media'
export {
  IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_MEDIA_PER_PIECE,
  MAX_VIDEO_DURATION,
  MAX_VIDEO_SIZE,
  VALID_IMAGE_TYPES,
  VALID_VIDEO_TYPES,
  VIDEO_EXTENSIONS,
} from './media'
export * from './newsletter'
export type {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from './order'
export * from './order'
export type {
  CheckoutPaymentInfo,
  CreatePayPalConnectInput,
  CreateStripeConnectInput,
  PaymentMethod,
  PaymentProvider,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
  PayPalConnectStatus,
  PayPalReferralResponse,
  StripeConnectRequirements,
  StripeConnectStatus,
  StripeDashboardResponse,
  StripeOnboardingResponse,
  TenantPaymentConfig,
} from './payment'
export * from './payment'
export type {
  CreatePayoutInput,
  Payout,
  PayoutFilters,
  PayoutListOptions,
  PayoutStatus,
  PayoutSummary,
} from './payout'
export * from './payout'
export type {
  CreateDigitalFileInput,
  CreatePieceInput,
  DigitalFile,
  DigitalProductConfig,
  PersonalizationConfig,
  PersonalizationField,
  PersonalizationFieldType,
  PersonalizationValue,
  Piece,
  PieceFilters,
  PieceIntegrations,
  PieceMaterialUsage,
  PieceStatus,
  PieceWithMedia,
  ProductVariant,
  ProductVariation,
  UpdateDigitalFileInput,
  UpdatePieceInput,
  VariantCombination,
  VariantOption,
  VariationOption,
} from './piece'
export * from './piece'
export type {
  CartProduct,
  CreateProductInput,
  Product,
  ProductAttributes,
  ProductFilters,
  ProductIntegrations,
  ProductStatus,
  ProductWithMedia,
  ProductWithSeller,
  UpdateProductInput,
} from './product'
export * from './product'
export type {
  CreateProductionRunInput,
  ProductionMaterialConsumption,
  ProductionRun,
  ProductionRunFilters,
  ProductionRunListOptions,
  ProductionSummary,
} from './productionRun'
export * from './productionRun'
export type {
  AICaptionRequest,
  AICaptionResponse,
  PlatformResult,
  PublishRecord,
  PublishStatus,
} from './publish'
export * from './publish'
export type {
  AddReconciliationItemInput,
  CreateReconciliationInput,
  InventoryReconciliation,
  ReconciliationFilters,
  ReconciliationItem,
  ReconciliationListOptions,
  ReconciliationReason,
  ReconciliationStatus,
  UpdateReconciliationItemInput,
} from './reconciliation'
export * from './reconciliation'
export { RECONCILIATION_REASON_LABELS } from './reconciliation'
export type {
  CreateReviewInput,
  ProductReviewStats,
  Review,
  ReviewFilters,
  ReviewListOptions,
  ReviewModerationInput,
  ReviewPhoto,
  ReviewStatus,
  UpdateReviewInput,
} from './review'
export * from './review'
export type {
  DesignImportState,
  DesignImportStatus,
  DetectedSection,
  DnsRecord,
  DomainOnboardingState,
  DomainOnboardingStatus,
  ExtractedDesign,
  NavItem,
  NavStructure,
  PreviewConfig,
  SectionType,
  TemplateRecommendation,
} from './scanner'
export * from './scanner'
export type {
  FAQItem,
  FeatureItem,
  FooterColumn,
  FooterConfig,
  HeaderConfig,
  HeroSlide,
  NavLink,
  PageSection,
  PageSectionSettings,
  PageSectionType,
  PageType,
  TemplateDefinition,
  TestimonialItem,
  WebsitePage,
  WebsiteTemplate,
} from './template'
export * from './template'
export {
  createCustomPage,
  generatePageId,
  generateSectionId,
  getDefaultPages,
  getDefaultSections,
  LAYOUT_TO_TEMPLATE_MAP,
  migrateSectionsToPages,
  STANDARD_PAGE_SLUGS,
  TEMPLATE_DEFINITIONS,
  validatePageSlug,
} from './template'
// Re-export commonly used types for convenience
export type {
  BusinessAddress,
  OnboardingStep,
  SendleSettings,
  SocialConnection,
  SocialPlatform,
  Tenant,
  TenantFeatures,
  TenantTaxSettings,
} from './tenant'
// Export active types
export * from './tenant'
export type {
  AttributionData,
  DailyAnalytics,
  SourceAnalyticsSummary,
  SourceStats,
  TrackedLinks,
  TrackingEvent,
  TrackingEventType,
  TrafficSource,
  UTMParams,
} from './tracking'
export * from './tracking'
export type {
  CreateTransactionInput,
  QuarterlyGSTReport,
  TenantBalance,
  Transaction,
  TransactionFilters,
  TransactionListOptions,
  TransactionStatus,
  TransactionSummary,
  TransactionType,
} from './transaction'
export * from './transaction'
export {
  calculateGstFromExclusive,
  calculateGstFromInclusive,
  calculateStripeFee,
  getCurrentQuarter,
  getExclusiveAmount,
  parseQuarter,
} from './transaction'
export * from './wishlist'

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
