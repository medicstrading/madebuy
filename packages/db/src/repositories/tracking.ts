import { getDatabase } from '../client'
import type {
  TrackingEvent,
  TrackingEventType,
  DailyAnalytics,
  SourceStats,
  SourceAnalyticsSummary,
  TrafficSource,
} from '@madebuy/shared'

/**
 * Tracking Repository
 * UTM-based click tracking and source attribution
 */

// Collection names
const EVENTS_COLLECTION = 'analytics_events'
const DAILY_COLLECTION = 'analytics_daily'

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Ensure indexes exist (call on app startup)
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase()

  // TTL index for raw events (90 days)
  await db.collection(EVENTS_COLLECTION).createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  )

  // Query indexes for events
  await db.collection(EVENTS_COLLECTION).createIndex({ tenantId: 1, timestamp: -1 })
  await db.collection(EVENTS_COLLECTION).createIndex({ tenantId: 1, event: 1, timestamp: -1 })
  await db.collection(EVENTS_COLLECTION).createIndex({ tenantId: 1, source: 1, timestamp: -1 })
  await db.collection(EVENTS_COLLECTION).createIndex({ sessionId: 1 })

  // Daily aggregation indexes
  await db.collection(DAILY_COLLECTION).createIndex({ tenantId: 1, date: -1 }, { unique: true })
}

/**
 * Log a tracking event
 */
export async function logEvent(
  tenantId: string,
  event: TrackingEventType,
  source: TrafficSource | string,
  path: string,
  sessionId: string,
  productId?: string,
  metadata?: Record<string, string>
): Promise<void> {
  const db = await getDatabase()

  const trackingEvent: TrackingEvent = {
    id: generateEventId(),
    tenantId,
    event,
    source,
    path,
    sessionId,
    productId,
    timestamp: new Date(),
    metadata,
  }

  // Insert async - don't await for performance
  db.collection(EVENTS_COLLECTION).insertOne(trackingEvent).catch(err => {
    console.error('Failed to log tracking event:', err)
  })
}

/**
 * Get source breakdown for a period
 */
export async function getSourceBreakdown(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<SourceStats[]> {
  const db = await getDatabase()

  const result = await db.collection(EVENTS_COLLECTION).aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$source',
        views: {
          $sum: { $cond: [{ $in: ['$event', ['page_view', 'product_view']] }, 1, 0] },
        },
        enquiries: {
          $sum: { $cond: [{ $eq: ['$event', 'enquiry_submit'] }, 1, 0] },
        },
        purchases: {
          $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
        },
      },
    },
    { $sort: { views: -1 } },
  ]).toArray()

  return result.map(r => ({
    source: r._id || 'direct',
    views: r.views,
    enquiries: r.enquiries,
    purchases: r.purchases,
    conversionRate: r.views > 0 ? (r.enquiries / r.views) * 100 : 0,
    purchaseRate: r.views > 0 ? (r.purchases / r.views) * 100 : 0,
  }))
}

/**
 * Get full analytics summary
 */
export async function getAnalyticsSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<SourceAnalyticsSummary> {
  const db = await getDatabase()

  // Get totals
  const totals = await db.collection(EVENTS_COLLECTION).aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: { $cond: [{ $in: ['$event', ['page_view', 'product_view']] }, 1, 0] },
        },
        enquiries: {
          $sum: { $cond: [{ $eq: ['$event', 'enquiry_submit'] }, 1, 0] },
        },
        purchases: {
          $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
        },
        uniqueVisitors: { $addToSet: '$sessionId' },
      },
    },
  ]).toArray()

  const stats = totals[0] || { totalViews: 0, enquiries: 0, purchases: 0, uniqueVisitors: [] }

  // Get source breakdown
  const sources = await getSourceBreakdown(tenantId, startDate, endDate)

  // Get top products
  const topProducts = await db.collection(EVENTS_COLLECTION).aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate },
        productId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$productId',
        views: {
          $sum: { $cond: [{ $eq: ['$event', 'product_view'] }, 1, 0] },
        },
        enquiries: {
          $sum: { $cond: [{ $eq: ['$event', 'enquiry_submit'] }, 1, 0] },
        },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 10 },
  ]).toArray()

  // Fetch product names
  const productIds = topProducts.map(p => p._id)
  const pieces = await db.collection('pieces')
    .find({ id: { $in: productIds } })
    .project({ id: 1, name: 1 })
    .toArray()
  const pieceMap = new Map(pieces.map(p => [p.id, p.name]))

  // Calculate period string
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const period = `${days}d`

  return {
    period,
    totalViews: stats.totalViews,
    uniqueVisitors: Array.isArray(stats.uniqueVisitors) ? stats.uniqueVisitors.length : 0,
    enquiries: stats.enquiries,
    purchases: stats.purchases,
    conversionRate: stats.totalViews > 0 ? (stats.enquiries / stats.totalViews) * 100 : 0,
    sources,
    topProducts: topProducts.map(p => ({
      id: p._id,
      name: pieceMap.get(p._id) || 'Unknown Product',
      views: p.views,
      enquiries: p.enquiries,
    })),
  }
}

/**
 * Get daily analytics for a period
 */
export async function getDailyBreakdown(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyAnalytics[]> {
  const db = await getDatabase()

  const result = await db.collection(EVENTS_COLLECTION).aggregate([
    {
      $match: {
        tenantId,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          source: '$source',
        },
        pageViews: {
          $sum: { $cond: [{ $in: ['$event', ['page_view', 'product_view']] }, 1, 0] },
        },
        enquiries: {
          $sum: { $cond: [{ $eq: ['$event', 'enquiry_submit'] }, 1, 0] },
        },
        purchases: {
          $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
        },
        sessions: { $addToSet: '$sessionId' },
      },
    },
    {
      $group: {
        _id: '$_id.date',
        pageViews: { $sum: '$pageViews' },
        uniqueVisitors: { $addToSet: '$sessions' },
        enquiries: { $sum: '$enquiries' },
        purchases: { $sum: '$purchases' },
        sourceData: {
          $push: {
            source: '$_id.source',
            views: '$pageViews',
            enquiries: '$enquiries',
            purchases: '$purchases',
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray()

  return result.map(r => {
    // Flatten unique visitors
    const allSessions = (r.uniqueVisitors || []).flat()
    const uniqueSessions = new Set(allSessions)

    // Build source maps
    const sources: Record<string, number> = {}
    const enquiriesBySource: Record<string, number> = {}
    const purchasesBySource: Record<string, number> = {}

    for (const s of r.sourceData || []) {
      sources[s.source] = (sources[s.source] || 0) + s.views
      if (s.enquiries > 0) {
        enquiriesBySource[s.source] = (enquiriesBySource[s.source] || 0) + s.enquiries
      }
      if (s.purchases > 0) {
        purchasesBySource[s.source] = (purchasesBySource[s.source] || 0) + s.purchases
      }
    }

    return {
      tenantId,
      date: r._id,
      pageViews: r.pageViews,
      uniqueVisitors: uniqueSessions.size,
      sources,
      productViews: {}, // Would need separate aggregation
      enquiries: r.enquiries,
      enquiriesBySource,
      purchases: r.purchases,
      purchasesBySource,
    }
  })
}

/**
 * Detect traffic source from request
 */
export function detectSource(
  utmSource?: string,
  referrer?: string
): TrafficSource | string {
  // 1. UTM params (most reliable)
  if (utmSource) {
    return utmSource as TrafficSource
  }

  // 2. No referrer = direct
  if (!referrer) {
    return 'direct'
  }

  // 3. Internal marketplace referrer
  if (referrer.includes('madebuy.com.au/marketplace') ||
      referrer.includes('madebuy.com.au/browse') ||
      referrer.includes('madebuy.com.au/search')) {
    return 'marketplace'
  }

  // 4. Social platforms
  if (referrer.includes('facebook.com') || referrer.includes('fb.com')) {
    return 'facebook_organic'
  }
  if (referrer.includes('instagram.com')) {
    return 'instagram_organic'
  }
  if (referrer.includes('pinterest.com')) {
    return 'pinterest_organic'
  }
  if (referrer.includes('tiktok.com')) {
    return 'tiktok'
  }

  // 5. Search engines
  if (referrer.includes('google.com') || referrer.includes('google.com.au')) {
    return 'google'
  }
  if (referrer.includes('bing.com')) {
    return 'referral_other' // Could add 'bing' as source
  }

  // 6. Link aggregators
  if (referrer.includes('linktr.ee') || referrer.includes('linktree')) {
    return 'linktree'
  }

  // 7. Unknown referral
  return 'referral_other'
}

/**
 * Generate tracked links for a tenant
 */
export function generateTrackedLinks(
  tenantSlug: string,
  baseUrl: string = 'https://madebuy.com.au'
): {
  storefront: string
  links: Record<string, string>
} {
  const storefront = `${baseUrl}/${tenantSlug}`

  return {
    storefront,
    links: {
      instagram_bio: `${storefront}?utm_source=instagram_bio`,
      facebook_page: `${storefront}?utm_source=facebook_page`,
      tiktok_bio: `${storefront}?utm_source=tiktok_bio`,
      email_footer: `${storefront}?utm_source=email`,
      linktree: `${storefront}?utm_source=linktree`,
    },
  }
}

/**
 * Generate a product link with marketplace attribution
 */
export function generateMarketplaceLink(
  tenantSlug: string,
  productSlug: string,
  baseUrl: string = 'https://madebuy.com.au'
): string {
  return `${baseUrl}/${tenantSlug}/${productSlug}?utm_source=marketplace`
}
