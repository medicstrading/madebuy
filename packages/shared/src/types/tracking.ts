/**
 * Click Tracking Types
 * UTM-based traffic source tracking and attribution
 */

/**
 * Traffic source types
 */
export type TrafficSource =
  | 'instagram'
  | 'instagram_bio'
  | 'instagram_organic'
  | 'facebook'
  | 'facebook_page'
  | 'facebook_organic'
  | 'pinterest'
  | 'pinterest_organic'
  | 'tiktok'
  | 'tiktok_bio'
  | 'google'
  | 'marketplace'
  | 'email'
  | 'linktree'
  | 'referral_other'
  | 'direct'

/**
 * Tracking event types
 */
export type TrackingEventType =
  | 'page_view'
  | 'product_view'
  | 'enquiry_submit'
  | 'checkout_start'
  | 'purchase'

/**
 * Raw tracking event (stored with 90-day TTL)
 */
export interface TrackingEvent {
  id: string
  tenantId: string
  event: TrackingEventType
  source: TrafficSource | string // Allow custom sources
  productId?: string
  path: string
  sessionId: string
  timestamp: Date
  metadata?: Record<string, string>
}

/**
 * Daily aggregated analytics per tenant
 */
export interface DailyAnalytics {
  tenantId: string
  date: string // YYYY-MM-DD
  pageViews: number
  uniqueVisitors: number
  sources: Record<string, number> // { "instagram": 45, "marketplace": 23 }
  productViews: Record<string, number> // { "product_abc": 12 }
  enquiries: number
  enquiriesBySource: Record<string, number>
  purchases: number
  purchasesBySource: Record<string, number>
}

/**
 * Source statistics for analytics dashboard
 */
export interface SourceStats {
  source: string
  views: number
  enquiries: number
  purchases: number
  conversionRate: number // enquiries / views * 100
  purchaseRate: number // purchases / views * 100
}

/**
 * Analytics summary response
 */
export interface SourceAnalyticsSummary {
  period: string // "7d", "30d", "90d"
  totalViews: number
  uniqueVisitors: number
  enquiries: number
  purchases: number
  conversionRate: number
  sources: SourceStats[]
  topProducts: {
    id: string
    name: string
    views: number
    enquiries: number
  }[]
}

/**
 * Pre-built tracked links for tenant dashboard
 */
export interface TrackedLinks {
  storefront: string
  links: {
    instagram_bio: string
    facebook_page: string
    tiktok_bio: string
    email_footer: string
    linktree: string
    custom?: string
  }
}

/**
 * Attribution cookie data
 */
export interface AttributionData {
  source: TrafficSource | string
  landingPage: string
  landedAt: string // ISO date
  sessionId: string
}

/**
 * UTM parameters
 */
export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}
