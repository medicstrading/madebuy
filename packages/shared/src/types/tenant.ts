import type { MakerType } from '../constants/makerPresets'
import type { TenantPaymentConfig } from './payment'
import type { WebsiteTemplate, WebsitePage, PageSection, HeaderConfig, FooterConfig } from './template'

/**
 * Tenant - Multi-tenant user/shop owner
 */

// Onboarding step type
export type OnboardingStep = 'domain' | 'design' | 'complete'

export interface Tenant {
  id: string
  slug: string // Username/subdomain for storefront
  email: string
  passwordHash: string

  // Onboarding
  onboardingComplete?: boolean
  onboardingStep?: OnboardingStep

  // Profile
  businessName: string
  tagline?: string
  description?: string
  location?: string
  phone?: string

  // Maker type & categories
  makerType?: MakerType
  customCategories?: string[] // Custom product categories (added on top of presets)
  customMaterialCategories?: string[] // Custom material categories

  // Branding
  primaryColor: string
  accentColor: string
  logoMediaId?: string

  // Social links
  instagram?: string
  facebook?: string
  tiktok?: string
  pinterest?: string
  etsy?: string

  // Custom domain
  customDomain?: string
  cloudflareZoneId?: string
  nameservers?: string[]
  domainStatus: DomainStatus

  // Social publishing connections
  socialConnections?: SocialConnection[]

  // Plan & billing
  plan: Plan
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: SubscriptionStatus

  // Feature flags
  features: TenantFeatures

  // Usage tracking for quota enforcement
  usage?: TenantUsage

  // Website customization
  websiteDesign?: TenantWebsiteDesign

  // Shipping configuration
  shippingMethods?: TenantShippingMethod[]
  sendleSettings?: SendleSettings

  // Payment provider configuration (Stripe Connect, PayPal)
  paymentConfig?: TenantPaymentConfig

  // Tax/GST configuration (Australian GST)
  taxSettings?: TenantTaxSettings

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export type DomainStatus = 'none' | 'pending_nameservers' | 'active'
export type Plan = 'free' | 'maker' | 'professional' | 'studio'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'

export interface SocialConnection {
  platform: SocialPlatform
  method: 'late' | 'native' // Late API or native platform API
  lateAccountId?: string
  accessToken?: string // Encrypted for native APIs
  refreshToken?: string
  accountId?: string
  accountName?: string
  isActive: boolean
  connectedAt: Date
  expiresAt?: Date
}

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube' | 'website-blog'

export interface TenantFeatures {
  socialPublishing: boolean
  aiCaptions: boolean
  unlimitedPieces: boolean
  customDomain: boolean
  prioritySupport: boolean
  apiAccess: boolean
  advancedAnalytics: boolean
}

// Usage tracking - stored separately on tenant for quota enforcement
export interface TenantUsage {
  storageUsedMB: number
  aiCaptionsUsedThisMonth: number
  ordersThisMonth: number
  lastResetDate: Date // For monthly quota resets
}

export interface TenantWebsiteDesign {
  // Multi-page template system
  template?: WebsiteTemplate
  pages?: WebsitePage[]       // All website pages with their sections
  header?: HeaderConfig
  footer?: FooterConfig
  typography: TypographyPreset

  // Blog settings (separate from pages for easy toggle)
  blog?: {
    enabled: boolean
    title?: string
    description?: string
  }

  // ===========================================
  // DEPRECATED: Legacy fields for migration
  // Remove after all tenants migrated
  // ===========================================
  /** @deprecated Use pages[].sections instead */
  pageSections?: PageSection[]
  /** @deprecated Use hero section in pages */
  banner?: {
    mediaId: string
    overlayText?: string
    overlaySubtext?: string
    ctaButton?: { text: string; url: string }
    overlayOpacity: number // 0-100
    height: 'small' | 'medium' | 'large'
  }
  /** @deprecated Use template instead */
  layout?: LayoutTemplate
  /** @deprecated Use pages instead */
  layoutContent?: LayoutContent
  /** @deprecated Use pages instead */
  sections?: CustomSection[]
}

export interface LayoutContent {
  // Classic Store Layout
  categorySectionTitle?: string
  productsSectionTitle?: string
  aboutTitle?: string
  aboutDescription?: string
  aboutImage?: string

  // Minimal Showcase Layout
  minimalHeroHeadline?: string
  featuredCollectionTitle?: string
  viewDetailsButtonText?: string

  // Featured Focus Layout
  collectionBadgeText?: string
  collectionBannerTitle?: string
  collectionBannerDescription?: string
  ourStoryTitle?: string
  ourStoryContent?: string
  ourStoryImage?: string
  signaturePiecesTitle?: string
  signaturePiecesSubtitle?: string

  // Magazine Style Layout
  latestBadgeText?: string
  magazineHeroHeadline?: string
  discoverMoreButtonText?: string
  moreCollectionTitle?: string
}

export type TypographyPreset = 'modern' | 'classic' | 'elegant' | 'bold' | 'minimal'
export type LayoutTemplate = 'grid' | 'minimal' | 'featured' | 'masonry'

export interface CustomSection {
  id: string
  type: SectionType
  order: number
  enabled: boolean
  config: SectionConfig
}

export type SectionType = 'hero' | 'features' | 'testimonials' | 'cta' | 'gallery' | 'text-image' | 'faq'

export interface SectionConfig {
  // Base config that all sections share
  title?: string
  description?: string
  backgroundColor?: string

  // Section-specific configs (discriminated by section type)
  // Hero section
  heroImage?: string
  heroHeight?: 'small' | 'medium' | 'large'
  heroOverlay?: boolean

  // Features section
  features?: Array<{
    icon?: string
    title: string
    description: string
  }>

  // Testimonials section
  testimonials?: Array<{
    name: string
    role?: string
    avatar?: string
    content: string
    rating?: number
  }>

  // CTA section
  ctaText?: string
  ctaUrl?: string
  ctaButtonText?: string

  // Gallery section
  images?: string[]
  galleryColumns?: number

  // Text-Image section
  image?: string
  imagePosition?: 'left' | 'right'
  content?: string

  // FAQ section
  faqs?: Array<{
    question: string
    answer: string
  }>
}

export interface CreateTenantInput {
  id: string // chosen slug/username
  email: string
  password: string
  businessName: string
  primaryColor?: string
  accentColor?: string
  makerType?: MakerType
}

export interface UpdateTenantInput {
  businessName?: string
  tagline?: string
  description?: string
  location?: string
  makerType?: MakerType
  customCategories?: string[]
  customMaterialCategories?: string[]
  primaryColor?: string
  accentColor?: string
  logoMediaId?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  pinterest?: string
  etsy?: string
  customDomain?: string
  cloudflareZoneId?: string
  nameservers?: string[]
  domainStatus?: DomainStatus
  socialConnections?: SocialConnection[]
  websiteDesign?: TenantWebsiteDesign
}

// Re-export MakerType for convenience
export type { MakerType } from '../constants/makerPresets'

// Shipping method configuration for tenant
export interface TenantShippingMethod {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  estimatedDays: { min: number; max: number }
  countries: string[]
  enabled: boolean
}

// Business address for shipping origin
export interface BusinessAddress {
  addressLine1: string
  addressLine2?: string
  suburb: string
  state: string  // State abbreviation (e.g., 'NSW', 'VIC', 'QLD')
  postcode: string
  country: string  // ISO country code (default 'AU')
}

// Sendle shipping integration settings
export interface SendleSettings {
  apiKey?: string  // Encrypted API key
  senderId?: string  // Sendle Account ID
  isConnected: boolean  // Whether credentials have been validated
  connectedAt?: Date  // When credentials were last verified
  environment: 'sandbox' | 'production'  // Which Sendle environment to use
  pickupAddress?: BusinessAddress  // Business address for shipping origin
}

// Tax/GST settings for Australian sellers
export interface TenantTaxSettings {
  gstRegistered: boolean  // Is the seller GST registered?
  abn?: string  // Australian Business Number (11 digits)
  gstRate: number  // GST rate (default 10 for Australia)
  pricesIncludeGst: boolean  // Are product prices GST inclusive?
}
