/**
 * Tenant - Multi-tenant user/shop owner
 */

export interface Tenant {
  id: string
  email: string
  passwordHash: string

  // Profile
  businessName: string
  tagline?: string
  description?: string
  location?: string

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

  // Marketplace integrations
  integrations?: TenantIntegrations

  // Plan & billing
  plan: Plan
  stripeCustomerId?: string
  subscriptionId?: string
  subscriptionStatus?: SubscriptionStatus

  // Feature flags
  features: TenantFeatures

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export type DomainStatus = 'none' | 'pending_nameservers' | 'active'
export type Plan = 'free' | 'pro' | 'enterprise'
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

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube'

export interface EtsyIntegration {
  shopId: string
  shopName: string
  accessToken: string
  refreshToken: string
  expiresAt: Date
  tokenType: string
  shippingProfileId?: string
  autoSync: boolean
  syncDirection: 'one_way' | 'two_way'
  connectedAt: Date
  lastSyncAt?: Date
}

export interface TenantIntegrations {
  etsy?: EtsyIntegration
}

export interface TenantFeatures {
  socialPublishing: boolean
  aiCaptions: boolean
  multiChannelOrders: boolean
  advancedAnalytics: boolean
  unlimitedPieces: boolean
  customDomain: boolean
}

export interface CreateTenantInput {
  id: string // chosen slug/username
  email: string
  password: string
  businessName: string
  primaryColor?: string
  accentColor?: string
}

export interface UpdateTenantInput {
  businessName?: string
  tagline?: string
  description?: string
  location?: string
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
}
