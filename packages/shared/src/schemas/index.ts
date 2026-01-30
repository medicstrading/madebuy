/**
 * Zod validation schemas
 * Centralized validation for all API endpoints
 *
 * Note: We only export schemas and validation functions to avoid
 * type conflicts with existing types in @madebuy/shared/types
 */

// Common schemas
export {
  ObjectIdSchema,
  PaginationSchema,
  SortOrderSchema,
  CurrencyCodeSchema,
  CountryCodeSchema,
  EmailSchema,
  PhoneSchema,
  UrlSchema,
  SlugSchema,
  ColorHexSchema,
  PositiveNumberSchema,
  NonNegativeNumberSchema,
  DateRangeSchema,
  ShortTextSchema,
  MediumTextSchema,
  LongTextSchema,
  type Pagination,
} from './common.schema'

// Piece schemas - only export schemas and validation functions
export {
  PieceStatusSchema,
  MaterialUsageSchema,
  VariantOptionSchema,
  ProductVariantSchema,
  PiecePersonalizationFieldSchema,
  ShippingDimensionsSchema,
  DigitalFileSchema,
  CreatePieceSchema,
  UpdatePieceSchema,
  BulkUpdatePiecesSchema,
  validateCreatePiece,
  safeValidateCreatePiece,
  validateUpdatePiece,
  safeValidateUpdatePiece,
  validateBulkUpdatePieces,
  safeValidateBulkUpdatePieces,
} from './piece.schema'

// Order schemas
export {
  OrderStatusSchema,
  PaymentStatusSchema,
  ShippingAddressSchema as OrderShippingAddressSchema,
  OrderItemSchema,
  ShippingDetailsSchema,
  PaymentDetailsSchema,
  OrderPricingSchema,
  CreateOrderSchema,
  UpdateOrderSchema,
  ShipOrderSchema,
  RefundOrderSchema,
  OrderFiltersSchema,
  validateCreateOrder,
  safeValidateCreateOrder,
  validateUpdateOrder,
  safeValidateUpdateOrder,
  validateShipOrder,
  safeValidateShipOrder,
} from './order.schema'

// Tenant schemas
export {
  MakerTypeSchema,
  RegionalSettingsSchema,
  SocialLinksSchema,
  WebsiteDesignSchema,
  NotificationPreferencesSchema,
  SubscriptionPlanSchema,
  FeatureFlagsSchema,
  ShippingMethodSchema as TenantShippingMethodSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  UpdateTaxSettingsSchema,
  UpdateNotificationSettingsSchema,
  validateCreateTenant,
  safeValidateCreateTenant,
  validateUpdateTenant,
  safeValidateUpdateTenant,
  validateUpdateTaxSettings,
  safeValidateUpdateTaxSettings,
} from './tenant.schema'

// Review schemas
export {
  ReviewStatusSchema,
  CreateReviewSchema,
  UpdateReviewSchema,
  ReviewFiltersSchema,
  validateCreateReview,
  safeValidateCreateReview,
  validateUpdateReview,
  safeValidateUpdateReview,
} from './review.schema'

// Enquiry schemas
export {
  EnquiryStatusSchema,
  EnquirySourceSchema,
  CreateEnquirySchema,
  ReplyEnquirySchema,
  UpdateEnquirySchema,
  EnquiryFiltersSchema,
  validateCreateEnquiry,
  safeValidateCreateEnquiry,
  validateReplyEnquiry,
  safeValidateReplyEnquiry,
  validateUpdateEnquiry,
  safeValidateUpdateEnquiry,
} from './enquiry.schema'
