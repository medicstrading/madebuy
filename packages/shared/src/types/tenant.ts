import type { MakerType } from '../constants/makerPresets'

/**
 * Tenant - Multi-tenant user/shop owner
 */

export interface Tenant {
  id: string
  slug: string // Username/subdomain for storefront
  email: string
  passwordHash: string

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

  // Website customization
  websiteDesign?: TenantWebsiteDesign

  // Shipping configuration
  shippingMethods?: TenantShippingMethod[]

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export type DomainStatus = 'none' | 'pending_nameservers' | 'active'
export type Plan = 'free' | 'pro' | 'business' | 'enterprise'
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
}

export interface TenantWebsiteDesign {
  banner?: {
    mediaId: string
    overlayText?: string
    overlaySubtext?: string
    ctaButton?: { text: string; url: string }
    overlayOpacity: number // 0-100
    height: 'small' | 'medium' | 'large'
  }
  typography: TypographyPreset
  layout: LayoutTemplate
  layoutContent?: LayoutContent
  sections: CustomSection[]
  blog?: {
    enabled: boolean
    title?: string
    description?: string
  }
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
