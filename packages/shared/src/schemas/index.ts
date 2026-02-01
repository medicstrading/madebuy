/**
 * Zod validation schemas
 * Centralized validation for all API endpoints
 *
 * Note: We only export schemas and validation functions to avoid
 * type conflicts with existing types in @madebuy/shared/types
 */

// Common schemas
export {
  ColorHexSchema,
  CountryCodeSchema,
  CurrencyCodeSchema,
  DateRangeSchema,
  EmailSchema,
  LongTextSchema,
  MediumTextSchema,
  NonNegativeNumberSchema,
  ObjectIdSchema,
  type Pagination,
  PaginationSchema,
  PhoneSchema,
  PositiveNumberSchema,
  ShortTextSchema,
  SlugSchema,
  SortOrderSchema,
  UrlSchema,
} from './common.schema'
// Enquiry schemas
export {
  CreateEnquirySchema,
  EnquiryFiltersSchema,
  EnquirySourceSchema,
  EnquiryStatusSchema,
  ReplyEnquirySchema,
  safeValidateCreateEnquiry,
  safeValidateReplyEnquiry,
  safeValidateUpdateEnquiry,
  UpdateEnquirySchema,
  validateCreateEnquiry,
  validateReplyEnquiry,
  validateUpdateEnquiry,
} from './enquiry.schema'

// Order schemas
export {
  CreateOrderSchema,
  OrderFiltersSchema,
  OrderItemSchema,
  OrderPricingSchema,
  OrderStatusSchema,
  PaymentDetailsSchema,
  PaymentStatusSchema,
  RefundOrderSchema,
  ShipOrderSchema,
  ShippingAddressSchema as OrderShippingAddressSchema,
  ShippingDetailsSchema,
  safeValidateCreateOrder,
  safeValidateShipOrder,
  safeValidateUpdateOrder,
  UpdateOrderSchema,
  validateCreateOrder,
  validateShipOrder,
  validateUpdateOrder,
} from './order.schema'
// Piece schemas - only export schemas and validation functions
export {
  BulkUpdatePiecesSchema,
  CreatePieceSchema,
  DigitalFileSchema,
  MaterialUsageSchema,
  PiecePersonalizationFieldSchema,
  PieceStatusSchema,
  ProductVariantSchema,
  ShippingDimensionsSchema,
  safeValidateBulkUpdatePieces,
  safeValidateCreatePiece,
  safeValidateUpdatePiece,
  UpdatePieceSchema,
  VariantOptionSchema,
  validateBulkUpdatePieces,
  validateCreatePiece,
  validateUpdatePiece,
} from './piece.schema'

// Review schemas
export {
  CreateReviewSchema,
  ReviewFiltersSchema,
  ReviewStatusSchema,
  safeValidateCreateReview,
  safeValidateUpdateReview,
  UpdateReviewSchema,
  validateCreateReview,
  validateUpdateReview,
} from './review.schema'
// Tenant schemas
export {
  CreateTenantSchema,
  FeatureFlagsSchema,
  MakerTypeSchema,
  NotificationPreferencesSchema,
  RegionalSettingsSchema,
  ShippingMethodSchema as TenantShippingMethodSchema,
  SocialLinksSchema,
  SubscriptionPlanSchema,
  safeValidateCreateTenant,
  safeValidateUpdateTaxSettings,
  safeValidateUpdateTenant,
  UpdateNotificationSettingsSchema,
  UpdateTaxSettingsSchema,
  UpdateTenantSchema,
  validateCreateTenant,
  validateUpdateTaxSettings,
  validateUpdateTenant,
  WebsiteDesignSchema,
} from './tenant.schema'
