import type {
  CreateOrderInput,
  Order,
  PaginatedResult,
  PaginationParams,
} from '@madebuy/shared'
import { ObjectId } from 'mongodb'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

function calculateOrderTotals(
  items: Order['items'],
  shipping: number,
  tax: number,
  discount: number = 0,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const total = subtotal + shipping + tax - discount
  return { subtotal, total }
}

export async function createOrder(
  tenantId: string,
  data: CreateOrderInput,
  pricing: {
    shipping: number
    tax: number
    discount?: number
    currency?: string
    stripeSessionId?: string
    paymentIntentId?: string // WH-03: For refund lookup
    paymentMethod?: 'stripe' | 'paypal' | 'bank_transfer'
    paypalOrderId?: string
  },
): Promise<Order> {
  const db = await getDatabase()

  const { subtotal, total } = calculateOrderTotals(
    data.items,
    pricing.shipping,
    pricing.tax,
    pricing.discount || 0,
  )

  const order: Order = {
    id: nanoid(),
    tenantId,
    orderNumber: generateOrderNumber(),
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    items: data.items,
    subtotal,
    shipping: pricing.shipping,
    tax: pricing.tax,
    discount: pricing.discount || 0,
    total,
    currency: pricing.currency || 'AUD',
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress,
    shippingMethod: data.shippingMethod,
    shippingType: data.shippingType,
    paymentMethod: pricing.paymentMethod || 'stripe',
    paymentStatus: 'pending',
    status: 'pending',
    promotionCode: data.promotionCode,
    customerNotes: data.customerNotes,
    stripeSessionId: pricing.stripeSessionId, // For idempotency
    paymentIntentId: pricing.paymentIntentId, // WH-03: For refund lookup
    paypalOrderId: pricing.paypalOrderId, // For PayPal orders
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('orders').insertOne(order)
  return order
}

export async function getOrder(
  tenantId: string,
  id: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, id })) as Order | null
}

export async function getOrderByNumber(
  tenantId: string,
  orderNumber: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, orderNumber })) as Order | null
}

export async function getOrderByPaymentIntent(
  tenantId: string,
  paymentIntentId: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, paymentIntentId })) as Order | null
}

/**
 * Get order by Stripe checkout session ID (for idempotency checks)
 */
export async function getOrderByStripeSessionId(
  tenantId: string,
  sessionId: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, stripeSessionId: sessionId })) as Order | null
}

/**
 * Get order by PayPal order ID (for idempotency checks)
 */
export async function getOrderByPayPalOrderId(
  tenantId: string,
  paypalOrderId: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, paypalOrderId })) as Order | null
}

/**
 * Get order by order number with tenant isolation
 */
export async function getOrderByOrderNumber(
  tenantId: string,
  orderNumber: string,
): Promise<Order | null> {
  const db = await getDatabase()
  return (await db
    .collection('orders')
    .findOne({ tenantId, orderNumber })) as Order | null
}

export async function listOrders(
  tenantId: string,
  filters?: {
    status?: Order['status']
    paymentStatus?: Order['paymentStatus']
    customerEmail?: string
    limit?: number
    offset?: number
    /** If true, returns only essential fields for list views (reduces bandwidth) */
    listView?: boolean
  },
  pagination?: PaginationParams,
): Promise<Order[] | PaginatedResult<Order>> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.paymentStatus) {
    query.paymentStatus = filters.paymentStatus
  }

  if (filters?.customerEmail) {
    query.customerEmail = filters.customerEmail
  }

  // If pagination params provided, use cursor-based pagination
  if (pagination) {
    const limit = Math.min(pagination.limit || 50, 500)
    const sortBy = pagination.sortBy || 'createdAt'
    const sortOrder = pagination.sortOrder || 'desc'

    // Add cursor condition to query
    if (pagination.cursor) {
      try {
        query._id = {
          [sortOrder === 'asc' ? '$gt' : '$lt']: new ObjectId(
            pagination.cursor,
          ),
        }
      } catch (e) {
        // Invalid cursor - ignore and start from beginning
      }
    }

    let cursor = db.collection('orders').find(query)

    // Add projection for list views to reduce data transfer
    if (filters?.listView) {
      cursor = cursor.project({
        id: 1,
        tenantId: 1,
        orderNumber: 1,
        customerEmail: 1,
        customerName: 1,
        total: 1,
        currency: 1,
        status: 1,
        paymentStatus: 1,
        createdAt: 1,
        updatedAt: 1,
        // Include item count instead of full items array
        itemCount: { $size: { $ifNull: ['$items', []] } },
      })
    }

    // Fetch limit + 1 to check if there are more items
    const items = (await cursor
      .sort({
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
        _id: sortOrder === 'asc' ? 1 : -1,
      })
      .limit(limit + 1)
      .toArray()) as unknown as Order[]

    const hasMore = items.length > limit
    if (hasMore) {
      items.pop() // Remove the extra item
    }

    const nextCursor =
      hasMore && items.length > 0
        ? (items[items.length - 1] as any)._id.toString()
        : null

    return {
      data: items,
      nextCursor,
      hasMore,
    }
  }

  // Legacy offset-based pagination for backward compatibility
  let cursor = db.collection('orders').find(query)

  // Add projection for list views to reduce data transfer
  if (filters?.listView) {
    cursor = cursor.project({
      id: 1,
      tenantId: 1,
      orderNumber: 1,
      customerEmail: 1,
      customerName: 1,
      total: 1,
      currency: 1,
      status: 1,
      paymentStatus: 1,
      createdAt: 1,
      updatedAt: 1,
      // Include item count instead of full items array
      itemCount: { $size: { $ifNull: ['$items', []] } },
    })
  }

  cursor = cursor.sort({ createdAt: -1 })

  if (filters?.offset) {
    cursor = cursor.skip(filters.offset)
  }

  if (filters?.limit) {
    cursor = cursor.limit(filters.limit)
  }

  const results = await cursor.toArray()

  return results as unknown as Order[]
}

// Order status state machine: defines valid status transitions
const VALID_STATUS_TRANSITIONS: Record<
  Order['status'],
  Order['status'][]
> = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
  refunded: [], // Terminal state
}

export async function updateOrderStatus(
  tenantId: string,
  id: string,
  status: Order['status'],
): Promise<void> {
  const db = await getDatabase()

  // CASCADE-07: Validate state transition
  // Get current order status
  const order = (await db
    .collection('orders')
    .findOne({ tenantId, id })) as unknown as Order | null

  if (!order) {
    throw new Error(`Order ${id} not found`)
  }

  // Check if transition is valid
  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status]
  if (!allowedTransitions.includes(status)) {
    throw new Error(
      `Invalid status transition: cannot change from "${order.status}" to "${status}". Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
    )
  }

  await db.collection('orders').updateOne(
    { tenantId, id },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  )
}

export async function updateOrderPaymentStatus(
  tenantId: string,
  id: string,
  paymentStatus: Order['paymentStatus'],
): Promise<void> {
  const db = await getDatabase()
  await db.collection('orders').updateOne(
    { tenantId, id },
    {
      $set: {
        paymentStatus,
        updatedAt: new Date(),
      },
    },
  )
}

export async function updateOrder(
  tenantId: string,
  id: string,
  updates: Partial<
    Omit<Order, 'id' | 'tenantId' | 'orderNumber' | 'createdAt'>
  >,
): Promise<void> {
  const db = await getDatabase()

  // CASCADE-07: Strip status field to prevent bypassing state machine
  // Status changes MUST go through updateOrderStatus() for validation
  const { status, ...safeUpdates } = updates as any
  if (status) {
    console.warn('[orders] updateOrder called with status field - use updateOrderStatus() instead')
  }

  await db.collection('orders').updateOne(
    { tenantId, id },
    {
      $set: {
        ...safeUpdates,
        updatedAt: new Date(),
      },
    },
  )
}

export async function deleteOrder(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('orders').deleteOne({ tenantId, id })
}

export async function countOrders(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('orders').countDocuments({ tenantId })
}

/**
 * Get order statistics by status using MongoDB aggregation
 * Use this instead of fetching all orders and filtering client-side
 */
export async function getOrderStats(tenantId: string): Promise<{
  pending: number
  processing: number
  shipped: number
  delivered: number
  total: number
}> {
  const db = await getDatabase()
  const result = await db
    .collection('orders')
    .aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray()

  const statusMap = new Map(result.map((r) => [r._id, r.count]))
  return {
    pending: statusMap.get('pending') || 0,
    processing: statusMap.get('processing') || 0,
    shipped: statusMap.get('shipped') || 0,
    delivered: statusMap.get('delivered') || 0,
    total: result.reduce((sum, r) => sum + r.count, 0),
  }
}

/**
 * Get orders that need to be synced to accounting software
 * Returns paid orders from the last N days that haven't been synced
 */
export async function getOrdersForSync(
  tenantId: string,
  days: number = 30,
): Promise<Order[]> {
  const db = await getDatabase()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const results = await db
    .collection('orders')
    .find({
      tenantId,
      paymentStatus: 'paid',
      createdAt: { $gte: cutoffDate },
      // Not already synced to any accounting provider
      $or: [
        { syncedToAccounting: { $exists: false } },
        { syncedToAccounting: null },
        { 'syncedToAccounting.xero': { $exists: false } },
      ],
    })
    .sort({ createdAt: -1 })
    .toArray()

  return results as unknown as Order[]
}

/**
 * Mark an order as synced to an accounting provider
 * Requires tenantId for cross-tenant data isolation
 */
export async function markAsSynced(
  tenantId: string,
  orderId: string,
  provider: 'xero' | 'myob' | 'quickbooks',
  externalId: string | undefined,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('orders').updateOne(
    { tenantId, id: orderId },
    {
      $set: {
        [`syncedToAccounting.${provider}`]: {
          syncedAt: new Date(),
          externalId: externalId || null,
        },
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Get orders that failed to sync (for retry)
 */
export async function getFailedSyncOrders(
  tenantId: string,
  provider: 'xero' | 'myob' | 'quickbooks',
): Promise<Order[]> {
  const db = await getDatabase()

  const results = await db
    .collection('orders')
    .find({
      tenantId,
      paymentStatus: 'paid',
      [`syncedToAccounting.${provider}.error`]: { $exists: true },
    })
    .sort({ createdAt: -1 })
    .toArray()

  return results as unknown as Order[]
}

/**
 * Mark an order sync as failed (for retry tracking)
 * Requires tenantId for cross-tenant data isolation
 */
export async function markSyncFailed(
  tenantId: string,
  orderId: string,
  provider: 'xero' | 'myob' | 'quickbooks',
  error: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('orders').updateOne(
    { tenantId, id: orderId },
    {
      $set: {
        [`syncedToAccounting.${provider}`]: {
          error,
          failedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Bulk update order status for multiple orders
 * Returns the number of orders updated
 * CASCADE-07: Validates state transitions per order
 */
export async function bulkUpdateOrderStatus(
  tenantId: string,
  orderIds: string[],
  status: Order['status'],
): Promise<number> {
  if (orderIds.length === 0) return 0

  const db = await getDatabase()

  // Fetch current orders to validate transitions
  const orders = (await db
    .collection('orders')
    .find({ tenantId, id: { $in: orderIds } })
    .toArray()) as unknown as Order[]

  // Filter to only orders with valid transitions
  const validOrderIds: string[] = []
  for (const order of orders) {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status]
    if (allowedTransitions.includes(status)) {
      validOrderIds.push(order.id)
    } else {
      console.warn(
        `[orders] Skipping order ${order.id}: invalid transition from "${order.status}" to "${status}"`,
      )
    }
  }

  if (validOrderIds.length === 0) return 0

  // Update only orders with valid transitions
  const result = await db.collection('orders').updateMany(
    {
      tenantId,
      id: { $in: validOrderIds },
    },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  )

  return result.modifiedCount
}

/**
 * Get orders that are ready for review request emails
 * (delivered at least 7 days ago, review request not yet sent)
 * @deprecated Part of email review request system - being removed.
 * Reviews are now submitted via website design module.
 */
export async function getOrdersForReviewRequest(
  tenantId: string,
  minDeliveryDays: number = 7,
): Promise<Order[]> {
  const db = await getDatabase()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - minDeliveryDays)

  const orders = await db
    .collection('orders')
    .find({
      tenantId,
      status: 'delivered',
      deliveredAt: { $lte: cutoff },
      // Not yet sent a review request
      $or: [
        { reviewRequestSentAt: { $exists: false } },
        { reviewRequestSentAt: null },
      ],
    })
    .toArray()

  return orders as unknown as Order[]
}

/**
 * Mark review request as sent for an order
 * @deprecated Part of email review request system - being removed
 */
export async function markReviewRequestSent(
  tenantId: string,
  orderId: string,
): Promise<void> {
  const db = await getDatabase()

  await db.collection('orders').updateOne(
    { tenantId, id: orderId },
    {
      $set: {
        reviewRequestSentAt: new Date(),
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Find a delivered order where the customer purchased a specific product.
 * Used for verifying purchase before allowing review submission.
 *
 * @param tenantId - Tenant ID
 * @param email - Customer email
 * @param pieceId - Product ID to check for
 * @returns Order if found, null otherwise
 */
export async function findDeliveredOrderWithProduct(
  tenantId: string,
  email: string,
  pieceId: string,
): Promise<Order | null> {
  const db = await getDatabase()

  // Find any delivered order from this customer that contains the product
  const order = await db.collection('orders').findOne({
    tenantId,
    customerEmail: email.toLowerCase(),
    status: 'delivered',
    'items.pieceId': pieceId,
  })

  return order as Order | null
}

interface RefundInfo {
  refundedAmount: number
  refundedAt: Date
  refundId?: string
  reason?: string
}

/**
 * Update order refund status
 * Called when a charge.refunded webhook is received from Stripe
 *
 * @param tenantId - Tenant ID
 * @param paymentIntentId - Stripe payment intent ID
 * @param refundInfo - Refund information
 * @returns True if order was found and updated
 */
export async function updateRefundStatus(
  tenantId: string,
  paymentIntentId: string,
  refundInfo: RefundInfo,
): Promise<boolean> {
  const db = await getDatabase()

  const result = await db.collection('orders').updateOne(
    { tenantId, paymentIntentId },
    {
      $set: {
        refundedAmount: refundInfo.refundedAmount,
        refundedAt: refundInfo.refundedAt,
        refundId: refundInfo.refundId,
        refundReason: refundInfo.reason,
        status: refundInfo.refundedAmount > 0 ? 'refunded' : 'paid',
        updatedAt: new Date(),
      },
    },
  )

  return result.modifiedCount > 0
}
