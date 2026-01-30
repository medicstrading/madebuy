import { z } from 'zod'
import {
  ColorHexSchema,
  EmailSchema,
  ObjectIdSchema,
  ShortTextSchema,
  SlugSchema,
  UrlSchema,
} from './common.schema'

/**
 * Tenant validation schemas
 */

// Maker type enum
export const MakerTypeSchema = z.enum([
  'handmade',
  'vintage',
  'supplies',
  'digital',
  'custom',
  'other',
])

// Regional settings
export const RegionalSettingsSchema = z.object({
  country: z.string().length(2).toUpperCase().default('AU'),
  currency: z.string().length(3).toUpperCase().default('AUD'),
  timezone: z.string().default('Australia/Sydney'),
  taxEnabled: z.boolean().default(false),
  taxRate: z.number().min(0).max(100).optional(),
  taxLabel: ShortTextSchema.optional(),
})

// Social links
export const SocialLinksSchema = z.object({
  instagram: UrlSchema.optional(),
  facebook: UrlSchema.optional(),
  tiktok: UrlSchema.optional(),
  pinterest: UrlSchema.optional(),
  etsy: UrlSchema.optional(),
  website: UrlSchema.optional(),
})

// Website design settings
export const WebsiteDesignSchema = z.object({
  primaryColor: ColorHexSchema.default('#000000'),
  accentColor: ColorHexSchema.default('#ffffff'),
  fontFamily: z.enum(['inter', 'roboto', 'playfair', 'lato']).default('inter'),
  logoMediaId: ObjectIdSchema.optional(),
  heroImageMediaId: ObjectIdSchema.optional(),
  layout: z.enum(['grid', 'masonry', 'list']).default('grid'),
  showReviews: z.boolean().default(true),
  showSocialLinks: z.boolean().default(true),
})

// Notification preferences
export const NotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  newOrderEmail: z.boolean().default(true),
  lowStockEmail: z.boolean().default(true),
  customerEnquiryEmail: z.boolean().default(true),
  weeklyReportEmail: z.boolean().default(false),
})

// Subscription plan
export const SubscriptionPlanSchema = z.enum(['free', 'maker', 'pro', 'business'])

// Feature flags
export const FeatureFlagsSchema = z.object({
  socialPublishing: z.boolean().default(false),
  aiCaptions: z.boolean().default(false),
  unlimitedPieces: z.boolean().default(false),
  customDomain: z.boolean().default(false),
  analytics: z.boolean().default(false),
  emailMarketing: z.boolean().default(false),
  multiCurrency: z.boolean().default(false),
})

// Shipping method
export const ShippingMethodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('AUD'),
  estimatedDays: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
  countries: z.array(z.string().length(2)).default([]),
  enabled: z.boolean().default(true),
})

// Create tenant input
export const CreateTenantSchema = z.object({
  email: EmailSchema,
  businessName: z.string().min(1).max(200),
  slug: SlugSchema,
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  location: ShortTextSchema.optional(),
  makerType: MakerTypeSchema.optional(),
  regionalSettings: RegionalSettingsSchema.optional(),
  websiteDesign: WebsiteDesignSchema.optional(),
})

// Update tenant input (commonly updated fields)
export const UpdateTenantSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  location: ShortTextSchema.optional(),
  makerType: MakerTypeSchema.optional(),
  customCategories: z.array(ShortTextSchema).max(50).optional(),
  customMaterialCategories: z.array(ShortTextSchema).max(50).optional(),
  primaryColor: ColorHexSchema.optional(),
  accentColor: ColorHexSchema.optional(),
  logoMediaId: ObjectIdSchema.optional(),
  instagram: UrlSchema.optional(),
  facebook: UrlSchema.optional(),
  tiktok: UrlSchema.optional(),
  pinterest: UrlSchema.optional(),
  etsy: UrlSchema.optional(),
  websiteDesign: WebsiteDesignSchema.partial().optional(),
  regionalSettings: RegionalSettingsSchema.partial().optional(),
  notificationPreferences: NotificationPreferencesSchema.partial().optional(),
  shippingMethods: z.array(ShippingMethodSchema).optional(),
  onboardingComplete: z.boolean().optional(),
  onboardingStep: z.number().int().min(0).max(10).optional(),
})

// Tax settings update
export const UpdateTaxSettingsSchema = z.object({
  taxEnabled: z.boolean(),
  taxRate: z.number().min(0).max(100).optional(),
  taxLabel: ShortTextSchema.optional(),
  taxNumber: ShortTextSchema.optional(),
})

// Notification settings update
export const UpdateNotificationSettingsSchema = NotificationPreferencesSchema.partial()

// Inferred types
export type MakerType = z.infer<typeof MakerTypeSchema>
export type RegionalSettings = z.infer<typeof RegionalSettingsSchema>
export type SocialLinks = z.infer<typeof SocialLinksSchema>
export type WebsiteDesign = z.infer<typeof WebsiteDesignSchema>
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
export type UpdateTaxSettingsInput = z.infer<typeof UpdateTaxSettingsSchema>
export type UpdateNotificationSettingsInput = z.infer<
  typeof UpdateNotificationSettingsSchema
>

// Validation helpers
export function validateCreateTenant(data: unknown): CreateTenantInput {
  return CreateTenantSchema.parse(data)
}

export function safeValidateCreateTenant(data: unknown) {
  return CreateTenantSchema.safeParse(data)
}

export function validateUpdateTenant(data: unknown): UpdateTenantInput {
  return UpdateTenantSchema.parse(data)
}

export function safeValidateUpdateTenant(data: unknown) {
  return UpdateTenantSchema.safeParse(data)
}

export function validateUpdateTaxSettings(data: unknown): UpdateTaxSettingsInput {
  return UpdateTaxSettingsSchema.parse(data)
}

export function safeValidateUpdateTaxSettings(data: unknown) {
  return UpdateTaxSettingsSchema.safeParse(data)
}
