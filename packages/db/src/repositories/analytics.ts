import { getDatabase } from '../client'

export interface AnalyticsEvent {
  id: string
  tenantId: string
  sessionId: string
  event: 'view_product' | 'add_to_cart' | 'start_checkout' | 'complete_purchase'
  productId?: string
  orderId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface FunnelData {
  viewProduct: number
  addToCart: number
  startCheckout: number
  completePurchase: number
  viewToCartRate: number
  cartToCheckoutRate: number
  checkoutToPurchaseRate: number
  overallConversionRate: number
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  tenantId: string,
  event: AnalyticsEvent['event'],
  sessionId: string,
  data?: { productId?: string; orderId?: string; metadata?: Record<string, any> }
): Promise<void> {
  const db = await getDatabase()

  await db.collection('analytics_events').insertOne({
    tenantId,
    sessionId,
    event,
    productId: data?.productId,
    orderId: data?.orderId,
    metadata: data?.metadata,
    createdAt: new Date(),
  })
}

/**
 * Get funnel data for a tenant within a date range
 */
export async function getFunnelData(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<FunnelData> {
  const db = await getDatabase()

  const query = {
    tenantId,
    createdAt: { $gte: startDate, $lte: endDate }
  }

  const [viewProduct, addToCart, startCheckout, completePurchase] = await Promise.all([
    db.collection('analytics_events').countDocuments({ ...query, event: 'view_product' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'add_to_cart' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'start_checkout' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'complete_purchase' }),
  ])

  // Calculate conversion rates (avoid division by zero)
  const viewToCartRate = viewProduct > 0 ? (addToCart / viewProduct) * 100 : 0
  const cartToCheckoutRate = addToCart > 0 ? (startCheckout / addToCart) * 100 : 0
  const checkoutToPurchaseRate = startCheckout > 0 ? (completePurchase / startCheckout) * 100 : 0
  const overallConversionRate = viewProduct > 0 ? (completePurchase / viewProduct) * 100 : 0

  return {
    viewProduct,
    addToCart,
    startCheckout,
    completePurchase,
    viewToCartRate: Math.round(viewToCartRate * 10) / 10,
    cartToCheckoutRate: Math.round(cartToCheckoutRate * 10) / 10,
    checkoutToPurchaseRate: Math.round(checkoutToPurchaseRate * 10) / 10,
    overallConversionRate: Math.round(overallConversionRate * 10) / 10,
  }
}

/**
 * Get funnel data by product
 */
export async function getFunnelDataByProduct(
  tenantId: string,
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<FunnelData> {
  const db = await getDatabase()

  const query = {
    tenantId,
    productId,
    createdAt: { $gte: startDate, $lte: endDate }
  }

  const [viewProduct, addToCart, startCheckout, completePurchase] = await Promise.all([
    db.collection('analytics_events').countDocuments({ ...query, event: 'view_product' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'add_to_cart' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'start_checkout' }),
    db.collection('analytics_events').countDocuments({ ...query, event: 'complete_purchase' }),
  ])

  const viewToCartRate = viewProduct > 0 ? (addToCart / viewProduct) * 100 : 0
  const cartToCheckoutRate = addToCart > 0 ? (startCheckout / addToCart) * 100 : 0
  const checkoutToPurchaseRate = startCheckout > 0 ? (completePurchase / startCheckout) * 100 : 0
  const overallConversionRate = viewProduct > 0 ? (completePurchase / viewProduct) * 100 : 0

  return {
    viewProduct,
    addToCart,
    startCheckout,
    completePurchase,
    viewToCartRate: Math.round(viewToCartRate * 10) / 10,
    cartToCheckoutRate: Math.round(cartToCheckoutRate * 10) / 10,
    checkoutToPurchaseRate: Math.round(checkoutToPurchaseRate * 10) / 10,
    overallConversionRate: Math.round(overallConversionRate * 10) / 10,
  }
}

/**
 * Get top performing products by conversion
 */
export async function getTopProductsByConversion(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<{ productId: string; views: number; purchases: number; conversionRate: number }>> {
  const db = await getDatabase()

  const pipeline = [
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        productId: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$productId',
        views: {
          $sum: { $cond: [{ $eq: ['$event', 'view_product'] }, 1, 0] }
        },
        purchases: {
          $sum: { $cond: [{ $eq: ['$event', 'complete_purchase'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        productId: '$_id',
        views: 1,
        purchases: 1,
        conversionRate: {
          $cond: [
            { $gt: ['$views', 0] },
            { $multiply: [{ $divide: ['$purchases', '$views'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { conversionRate: -1 } },
    { $limit: limit }
  ]

  const results = await db.collection('analytics_events').aggregate(pipeline).toArray()

  return results.map(r => ({
    productId: r.productId,
    views: r.views,
    purchases: r.purchases,
    conversionRate: Math.round(r.conversionRate * 10) / 10
  }))
}
