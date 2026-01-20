/**
 * Platform Analytics Repository
 * Cross-tenant metrics for the platform admin dashboard
 */

import type {
  FeatureAdoption,
  MarketplaceStats,
  MRRBreakdown,
  MRRDataPoint,
  OrdersDataPoint,
  RevenueByTier,
  RevenueDataPoint,
  SignupDataPoint,
  TenantCounts,
  TenantHealthScore,
  TenantsByPlan,
  TopProduct,
  TopSeller,
} from '@madebuy/shared'
import {
  startOfMonth,
  subMonths,
  format,
  startOfDay,
  subDays,
  differenceInDays,
} from 'date-fns'
import { getDatabase } from '../client'

// =============================================================================
// REVENUE METRICS
// =============================================================================

/**
 * Get MRR time series for the last N months
 */
export async function getMRRTimeSeries(months: number = 12): Promise<MRRDataPoint[]> {
  const db = await getDatabase()
  const startDate = startOfMonth(subMonths(new Date(), months - 1))

  const pipeline = [
    {
      $match: {
        'subscription.status': 'active',
        'subscription.currentPeriodStart': { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: '$subscription.currentPeriodStart',
          },
        },
        mrr: {
          $sum: {
            $divide: ['$subscription.priceAmount', 100],
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()

  return results.map((r) => ({
    date: r._id,
    mrr: r.mrr || 0,
    newMrr: 0, // Would need more complex query
    expansionMrr: 0,
    churnedMrr: 0,
  }))
}

/**
 * Get current MRR breakdown
 */
export async function getMRRBreakdown(): Promise<MRRBreakdown> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        'subscription.status': 'active',
      },
    },
    {
      $group: {
        _id: null,
        totalMrr: {
          $sum: {
            $divide: ['$subscription.priceAmount', 100],
          },
        },
        count: { $sum: 1 },
      },
    },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()
  const current = results[0] || { totalMrr: 0, count: 0 }

  return {
    totalMrr: current.totalMrr,
    newMrr: 0, // Would need historical comparison
    expansionMrr: 0,
    churnedMrr: 0,
    netMrrGrowth: 0,
    growthRate: 0,
  }
}

/**
 * Get revenue time series from transactions
 */
export async function getRevenueTimeSeries(
  period: 'day' | 'week' | 'month' = 'day',
  count: number = 30,
): Promise<RevenueDataPoint[]> {
  const db = await getDatabase()
  const startDate = subDays(new Date(), count)

  const dateFormat = period === 'month' ? '%Y-%m' : '%Y-%m-%d'

  const pipeline = [
    {
      $match: {
        type: 'sale',
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: '$createdAt' },
        },
        revenue: { $sum: { $divide: ['$grossAmount', 100] } },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]

  const results = await db.collection('transactions').aggregate(pipeline).toArray()

  return results.map((r) => ({
    date: r._id,
    revenue: r.revenue,
    orderCount: r.orderCount,
    avgOrderValue: r.orderCount > 0 ? r.revenue / r.orderCount : 0,
  }))
}

/**
 * Get revenue breakdown by subscription tier
 */
export async function getRevenueByTier(): Promise<RevenueByTier[]> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        'subscription.status': 'active',
      },
    },
    {
      $group: {
        _id: '$plan',
        revenue: {
          $sum: { $divide: ['$subscription.priceAmount', 100] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()
  const total = results.reduce((sum, r) => sum + r.revenue, 0)

  return results.map((r) => ({
    tier: r._id || 'free',
    revenue: r.revenue,
    count: r.count,
    percentage: total > 0 ? (r.revenue / total) * 100 : 0,
  }))
}

/**
 * Get top sellers by revenue
 */
export async function getTopSellersByRevenue(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date,
): Promise<TopSeller[]> {
  const db = await getDatabase()

  const match: Record<string, unknown> = {
    type: 'sale',
    status: 'completed',
  }
  if (startDate || endDate) {
    match.createdAt = {}
    if (startDate) (match.createdAt as Record<string, Date>).$gte = startDate
    if (endDate) (match.createdAt as Record<string, Date>).$lte = endDate
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$tenantId',
        totalRevenue: { $sum: { $divide: ['$grossAmount', 100] } },
        orderCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'tenants',
        localField: '_id',
        foreignField: 'id',
        as: 'tenant',
      },
    },
    { $unwind: '$tenant' },
    {
      $project: {
        tenantId: '$_id',
        businessName: '$tenant.businessName',
        slug: '$tenant.slug',
        plan: '$tenant.plan',
        totalRevenue: 1,
        orderCount: 1,
        avgOrderValue: {
          $cond: [
            { $gt: ['$orderCount', 0] },
            { $divide: ['$totalRevenue', '$orderCount'] },
            0,
          ],
        },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
  ]

  const results = await db.collection('transactions').aggregate(pipeline).toArray()

  return results.map((r) => ({
    tenantId: r.tenantId,
    businessName: r.businessName || 'Unknown',
    slug: r.slug || '',
    plan: r.plan || 'free',
    totalRevenue: r.totalRevenue,
    orderCount: r.orderCount,
    avgOrderValue: r.avgOrderValue,
  }))
}

// =============================================================================
// TENANT METRICS
// =============================================================================

/**
 * Get tenant counts by status
 */
export async function getTenantCounts(): Promise<TenantCounts> {
  const db = await getDatabase()
  const thirtyDaysAgo = subDays(new Date(), 30)

  const pipeline = [
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [
          {
            $match: {
              $or: [
                { 'subscription.status': 'active' },
                { plan: { $ne: 'free' } },
              ],
            },
          },
          { $count: 'count' },
        ],
        trial: [
          {
            $match: {
              'subscription.status': 'trialing',
            },
          },
          { $count: 'count' },
        ],
        churned: [
          {
            $match: {
              'subscription.status': 'canceled',
              'subscription.canceledAt': { $gte: thirtyDaysAgo },
            },
          },
          { $count: 'count' },
        ],
        suspended: [
          {
            $match: {
              suspended: true,
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()
  const data = results[0] || {}

  return {
    total: data.total?.[0]?.count || 0,
    active: data.active?.[0]?.count || 0,
    trial: data.trial?.[0]?.count || 0,
    churned: data.churned?.[0]?.count || 0,
    suspended: data.suspended?.[0]?.count || 0,
  }
}

/**
 * Get signup time series
 */
export async function getSignupTimeSeries(
  period: 'day' | 'week' | 'month' = 'day',
  count: number = 30,
): Promise<SignupDataPoint[]> {
  const db = await getDatabase()
  const startDate = subDays(new Date(), count)

  const dateFormat = period === 'month' ? '%Y-%m' : '%Y-%m-%d'

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: '$createdAt' },
        },
        signups: { $sum: 1 },
        conversions: {
          $sum: {
            $cond: [{ $ne: ['$plan', 'free'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()

  return results.map((r) => ({
    date: r._id,
    signups: r.signups,
    conversions: r.conversions,
    conversionRate: r.signups > 0 ? (r.conversions / r.signups) * 100 : 0,
  }))
}

/**
 * Get tenant distribution by plan
 */
export async function getTenantsByPlan(): Promise<TenantsByPlan[]> {
  const db = await getDatabase()

  const pipeline = [
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        mrr: {
          $sum: {
            $cond: [
              { $eq: ['$subscription.status', 'active'] },
              { $divide: ['$subscription.priceAmount', 100] },
              0,
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()
  const total = results.reduce((sum, r) => sum + r.count, 0)

  return results.map((r) => ({
    plan: r._id || 'free',
    count: r.count,
    percentage: total > 0 ? (r.count / total) * 100 : 0,
    mrr: r.mrr,
  }))
}

/**
 * Get tenant health scores (for identifying at-risk tenants)
 */
export async function getTenantHealthScores(
  limit: number = 50,
): Promise<TenantHealthScore[]> {
  const db = await getDatabase()
  const now = new Date()

  // Get tenants with activity metrics
  const pipeline = [
    {
      $lookup: {
        from: 'pieces',
        let: { tenantId: '$id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$tenantId', '$$tenantId'] } } },
          { $count: 'count' },
        ],
        as: 'pieceCount',
      },
    },
    {
      $lookup: {
        from: 'orders',
        let: { tenantId: '$id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$tenantId', '$$tenantId'] } } },
          { $count: 'count' },
        ],
        as: 'orderCount',
      },
    },
    {
      $lookup: {
        from: 'transactions',
        let: { tenantId: '$id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$tenantId', '$$tenantId'] },
              type: 'sale',
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $divide: ['$grossAmount', 100] } },
            },
          },
        ],
        as: 'revenue',
      },
    },
    {
      $project: {
        tenantId: '$id',
        businessName: 1,
        email: 1,
        slug: 1,
        plan: 1,
        lastLoginAt: '$lastLoginAt',
        productCount: { $ifNull: [{ $arrayElemAt: ['$pieceCount.count', 0] }, 0] },
        orderCount: { $ifNull: [{ $arrayElemAt: ['$orderCount.count', 0] }, 0] },
        totalRevenue: { $ifNull: [{ $arrayElemAt: ['$revenue.total', 0] }, 0] },
      },
    },
    { $limit: limit },
  ]

  const results = await db.collection('tenants').aggregate(pipeline).toArray()

  return results.map((r) => {
    const daysSinceLogin = r.lastLoginAt
      ? differenceInDays(now, new Date(r.lastLoginAt))
      : 999

    // Calculate health score (0-100)
    let score = 100
    if (daysSinceLogin > 30) score -= 30
    else if (daysSinceLogin > 14) score -= 15
    else if (daysSinceLogin > 7) score -= 5

    if (r.productCount === 0) score -= 30
    else if (r.productCount < 5) score -= 10

    if (r.orderCount === 0) score -= 20

    score = Math.max(0, score)

    const riskLevel: 'healthy' | 'at-risk' | 'churning' =
      score >= 70 ? 'healthy' : score >= 40 ? 'at-risk' : 'churning'

    return {
      tenantId: r.tenantId,
      businessName: r.businessName || 'Unknown',
      email: r.email,
      slug: r.slug || '',
      plan: r.plan || 'free',
      score,
      lastActive: r.lastLoginAt || null,
      productCount: r.productCount,
      orderCount: r.orderCount,
      totalRevenue: r.totalRevenue,
      daysSinceLastLogin: daysSinceLogin,
      riskLevel,
    }
  })
}

/**
 * Get feature adoption rates
 */
export async function getFeatureAdoption(): Promise<FeatureAdoption[]> {
  const db = await getDatabase()

  const features = [
    'socialPublishing',
    'aiCaptions',
    'customDomain',
    'advancedAnalytics',
    'apiAccess',
  ]

  const results: FeatureAdoption[] = []

  for (const feature of features) {
    const [adopted, available] = await Promise.all([
      db.collection('tenants').countDocuments({
        [`features.${feature}`]: true,
      }),
      db.collection('tenants').countDocuments({
        plan: { $in: ['maker', 'professional', 'studio'] },
      }),
    ])

    results.push({
      feature,
      adoptionCount: adopted,
      adoptionRate: available > 0 ? (adopted / available) * 100 : 0,
      availableToCount: available,
    })
  }

  return results
}

// =============================================================================
// MARKETPLACE METRICS
// =============================================================================

/**
 * Get overall marketplace statistics
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const db = await getDatabase()

  const [pieces, storefronts, orders, revenue] = await Promise.all([
    db.collection('pieces').countDocuments({ status: 'active' }),
    db.collection('tenants').countDocuments({ 'storefront.enabled': true }),
    db.collection('orders').countDocuments(),
    db
      .collection('transactions')
      .aggregate([
        { $match: { type: 'sale', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$grossAmount' }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ])

  const revenueData = revenue[0] || { total: 0, count: 0 }

  return {
    totalPieces: pieces,
    activeStorefronts: storefronts,
    totalOrders: orders,
    totalRevenue: revenueData.total / 100,
    avgOrderValue: revenueData.count > 0 ? revenueData.total / 100 / revenueData.count : 0,
    cartAbandonmentRate: 0, // Would need cart tracking data
  }
}

/**
 * Get orders time series
 */
export async function getOrdersTimeSeries(
  period: 'day' | 'week' | 'month' = 'day',
  count: number = 30,
): Promise<OrdersDataPoint[]> {
  const db = await getDatabase()
  const startDate = subDays(new Date(), count)

  const dateFormat = period === 'month' ? '%Y-%m' : '%Y-%m-%d'

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: dateFormat, date: '$createdAt' },
        },
        orders: { $sum: 1 },
        revenue: { $sum: { $divide: ['$total', 100] } },
      },
    },
    { $sort: { _id: 1 } },
  ]

  const results = await db.collection('orders').aggregate(pipeline).toArray()

  return results.map((r) => ({
    date: r._id,
    orders: r.orders,
    revenue: r.revenue,
  }))
}

/**
 * Get top products across all tenants
 */
export async function getTopProducts(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date,
): Promise<TopProduct[]> {
  const db = await getDatabase()

  const match: Record<string, unknown> = {}
  if (startDate || endDate) {
    match.createdAt = {}
    if (startDate) (match.createdAt as Record<string, Date>).$gte = startDate
    if (endDate) (match.createdAt as Record<string, Date>).$lte = endDate
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.pieceId',
        orderCount: { $sum: 1 },
        revenue: { $sum: { $divide: ['$items.total', 100] } },
      },
    },
    {
      $lookup: {
        from: 'pieces',
        localField: '_id',
        foreignField: 'id',
        as: 'piece',
      },
    },
    { $unwind: '$piece' },
    {
      $lookup: {
        from: 'tenants',
        localField: 'piece.tenantId',
        foreignField: 'id',
        as: 'tenant',
      },
    },
    { $unwind: '$tenant' },
    {
      $project: {
        pieceId: '$_id',
        pieceName: '$piece.name',
        tenantId: '$piece.tenantId',
        businessName: '$tenant.businessName',
        orderCount: 1,
        revenue: 1,
        views: { $ifNull: ['$piece.views', 0] },
      },
    },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
  ]

  const results = await db.collection('orders').aggregate(pipeline).toArray()

  return results.map((r) => ({
    pieceId: r.pieceId,
    pieceName: r.pieceName || 'Unknown',
    tenantId: r.tenantId,
    businessName: r.businessName || 'Unknown',
    orderCount: r.orderCount,
    revenue: r.revenue,
    views: r.views,
  }))
}
