import { getDatabase } from '../client'

/**
 * Analytics Repository
 * Provides aggregated statistics and reporting for tenant dashboards
 */

export interface SalesSummary {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  currency: string
}

export interface PeriodComparison {
  current: SalesSummary
  previous: SalesSummary
  percentChange: {
    revenue: number
    orders: number
    aov: number
  }
}

export interface DailySales {
  date: string // YYYY-MM-DD
  revenue: number
  orderCount: number
}

export interface TopProduct {
  pieceId: string
  name: string
  totalSold: number
  revenue: number
  imageUrl?: string
}

export interface CustomerStats {
  totalCustomers: number
  newCustomers: number // In period
  returningCustomers: number // Ordered more than once
  topCustomers: {
    email: string
    name: string
    orderCount: number
    totalSpent: number
  }[]
}

export interface CategoryBreakdown {
  category: string
  revenue: number
  orderCount: number
  percentage: number
}

export interface InventoryStats {
  totalProducts: number
  lowStock: number // Stock <= 3
  outOfStock: number
  totalValue: number // Sum of (stock * price)
}

/**
 * Get sales summary for a given period
 */
export async function getSalesSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<SalesSummary> {
  const db = await getDatabase()

  const result = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        orderCount: { $sum: 1 },
        currency: { $first: '$currency' },
      },
    },
  ]).toArray()

  const data = result[0] || { totalRevenue: 0, orderCount: 0, currency: 'AUD' }

  return {
    totalRevenue: data.totalRevenue,
    orderCount: data.orderCount,
    averageOrderValue: data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0,
    currency: data.currency || 'AUD',
  }
}

/**
 * Compare current period to previous period
 */
export async function getPeriodComparison(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<PeriodComparison> {
  // Calculate previous period of same length
  const periodLength = endDate.getTime() - startDate.getTime()
  const previousStart = new Date(startDate.getTime() - periodLength)
  const previousEnd = new Date(startDate.getTime() - 1)

  const [current, previous] = await Promise.all([
    getSalesSummary(tenantId, startDate, endDate),
    getSalesSummary(tenantId, previousStart, previousEnd),
  ])

  const calcChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  return {
    current,
    previous,
    percentChange: {
      revenue: calcChange(current.totalRevenue, previous.totalRevenue),
      orders: calcChange(current.orderCount, previous.orderCount),
      aov: calcChange(current.averageOrderValue, previous.averageOrderValue),
    },
  }
}

/**
 * Get daily sales data for charting
 */
export async function getDailySales(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DailySales[]> {
  const db = await getDatabase()

  const result = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        revenue: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]).toArray()

  // Fill in missing dates with zero values
  const salesMap = new Map(result.map(r => [r._id, r]))
  const dailySales: DailySales[] = []

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const data = salesMap.get(dateStr)
    dailySales.push({
      date: dateStr,
      revenue: data?.revenue || 0,
      orderCount: data?.orderCount || 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailySales
}

/**
 * Get top selling products
 */
export async function getTopProducts(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<TopProduct[]> {
  const db = await getDatabase()

  const result = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid',
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.pieceId',
        name: { $first: '$items.name' },
        imageUrl: { $first: '$items.imageUrl' },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]).toArray()

  return result.map(r => ({
    pieceId: r._id,
    name: r.name,
    totalSold: r.totalSold,
    revenue: r.revenue,
    imageUrl: r.imageUrl,
  }))
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<CustomerStats> {
  const db = await getDatabase()

  // Total unique customers
  const uniqueCustomers = await db.collection('orders').distinct('customerEmail', {
    tenantId,
    paymentStatus: 'paid',
  })

  // New customers in period
  const newInPeriod = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: '$customerEmail',
        firstOrder: { $min: '$createdAt' },
      },
    },
    {
      $match: {
        firstOrder: { $gte: startDate, $lte: endDate },
      },
    },
    { $count: 'count' },
  ]).toArray()

  // Returning customers (ordered more than once)
  const returning = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: '$customerEmail',
        orderCount: { $sum: 1 },
      },
    },
    {
      $match: {
        orderCount: { $gt: 1 },
      },
    },
    { $count: 'count' },
  ]).toArray()

  // Top customers by spending
  const topCustomers = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        paymentStatus: 'paid',
      },
    },
    {
      $group: {
        _id: '$customerEmail',
        name: { $first: '$customerName' },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 5 },
  ]).toArray()

  return {
    totalCustomers: uniqueCustomers.length,
    newCustomers: newInPeriod[0]?.count || 0,
    returningCustomers: returning[0]?.count || 0,
    topCustomers: topCustomers.map(c => ({
      email: c._id,
      name: c.name,
      orderCount: c.orderCount,
      totalSpent: c.totalSpent,
    })),
  }
}

/**
 * Get sales breakdown by category
 */
export async function getCategoryBreakdown(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryBreakdown[]> {
  const db = await getDatabase()

  const result = await db.collection('orders').aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid',
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]).toArray()

  const totalRevenue = result.reduce((sum, r) => sum + r.revenue, 0)

  return result.map(r => ({
    category: r._id || 'Uncategorized',
    revenue: r.revenue,
    orderCount: r.orderCount,
    percentage: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
  }))
}

/**
 * Get inventory statistics
 */
export async function getInventoryStats(tenantId: string): Promise<InventoryStats> {
  const db = await getDatabase()

  const result = await db.collection('pieces').aggregate([
    {
      $match: {
        tenantId,
        status: { $in: ['draft', 'available'] },
      },
    },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        lowStock: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$stock', null] }, { $lte: ['$stock', 3] }, { $gt: ['$stock', 0] }] },
              1,
              0,
            ],
          },
        },
        outOfStock: {
          $sum: {
            $cond: [{ $eq: ['$stock', 0] }, 1, 0],
          },
        },
        totalValue: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$stock', null] }, { $ne: ['$price', null] }] },
              { $multiply: ['$stock', '$price'] },
              0,
            ],
          },
        },
      },
    },
  ]).toArray()

  const stats = result[0] || { totalProducts: 0, lowStock: 0, outOfStock: 0, totalValue: 0 }

  return {
    totalProducts: stats.totalProducts,
    lowStock: stats.lowStock,
    outOfStock: stats.outOfStock,
    totalValue: stats.totalValue,
  }
}

/**
 * Get conversion rate (views to orders)
 */
export async function getConversionRate(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{ views: number; orders: number; conversionRate: number }> {
  const db = await getDatabase()

  // Get total views from pieces
  const viewsResult = await db.collection('pieces').aggregate([
    {
      $match: {
        tenantId,
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
      },
    },
  ]).toArray()

  const views = viewsResult[0]?.totalViews || 0

  // Get orders in period
  const ordersResult = await db.collection('orders').countDocuments({
    tenantId,
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
  })

  return {
    views,
    orders: ordersResult,
    conversionRate: views > 0 ? (ordersResult / views) * 100 : 0,
  }
}

/**
 * Record a product view
 */
export async function recordProductView(
  tenantId: string,
  pieceId: string
): Promise<void> {
  const db = await getDatabase()

  await db.collection('pieces').updateOne(
    { tenantId, id: pieceId },
    { $inc: { viewCount: 1 } }
  )
}
