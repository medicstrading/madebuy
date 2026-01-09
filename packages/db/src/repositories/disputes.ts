import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Dispute,
  DisputeStatus,
  CreateDisputeInput,
  UpdateDisputeInput,
  DisputeFilters,
  DisputeListOptions,
  DisputeStats,
} from '@madebuy/shared'

/**
 * Create a new dispute record
 */
export async function createDispute(data: CreateDisputeInput): Promise<Dispute> {
  const db = await getDatabase()

  const dispute: Dispute = {
    id: nanoid(),
    tenantId: data.tenantId,
    orderId: data.orderId,
    stripeDisputeId: data.stripeDisputeId,
    stripeChargeId: data.stripeChargeId,
    amount: data.amount,
    currency: data.currency || 'AUD',
    status: data.status,
    reason: data.reason,
    evidenceDueBy: data.evidenceDueBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('disputes').insertOne(dispute)
  return dispute
}

/**
 * Get a dispute by ID
 */
export async function getDispute(
  tenantId: string,
  id: string
): Promise<Dispute | null> {
  const db = await getDatabase()
  return await db.collection('disputes').findOne({ tenantId, id }) as Dispute | null
}

/**
 * Get a dispute by Stripe dispute ID
 *
 * SECURITY NOTE: This function intentionally queries without tenant isolation
 * because it's designed for Stripe webhook handlers that receive dispute IDs
 * without tenant context. The Stripe dispute ID is globally unique.
 *
 * DO NOT expose this function through any API endpoint that accepts user input.
 * For tenant-scoped queries, use getDispute(tenantId, id) instead.
 *
 * @internal Used by Stripe webhook handlers only
 */
export async function getDisputeByStripeId(
  stripeDisputeId: string
): Promise<Dispute | null> {
  const db = await getDatabase()
  return await db.collection('disputes').findOne({ stripeDisputeId }) as Dispute | null
}

/**
 * Get a dispute by Stripe dispute ID with tenant verification
 * Use this when you have tenant context and need extra security
 */
export async function getDisputeByStripeIdForTenant(
  tenantId: string,
  stripeDisputeId: string
): Promise<Dispute | null> {
  const db = await getDatabase()
  return await db.collection('disputes').findOne({ tenantId, stripeDisputeId }) as Dispute | null
}

/**
 * Update dispute
 */
export async function updateDispute(
  stripeDisputeId: string,
  updates: UpdateDisputeInput
): Promise<void> {
  const db = await getDatabase()

  const updateData: any = {
    updatedAt: new Date(),
  }

  if (updates.status) {
    updateData.status = updates.status
  }

  if (updates.orderId) {
    updateData.orderId = updates.orderId
  }

  if (updates.resolvedAt) {
    updateData.resolvedAt = updates.resolvedAt
  }

  await db.collection('disputes').updateOne(
    { stripeDisputeId },
    { $set: updateData }
  )
}

/**
 * List disputes for a tenant
 */
export async function listDisputes(
  tenantId: string,
  options?: DisputeListOptions
): Promise<Dispute[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (options?.filters) {
    const { status, startDate, endDate } = options.filters

    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = startDate
      if (endDate) query.createdAt.$lte = endDate
    }
  }

  const sortField = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1

  let cursor = db.collection('disputes')
    .find(query)
    .sort({ [sortField]: sortOrder })

  if (options?.offset) {
    cursor = cursor.skip(options.offset)
  }

  cursor = cursor.limit(options?.limit || 50)

  const results = await cursor.toArray()
  return results as unknown as Dispute[]
}

/**
 * Count disputes for a tenant
 */
export async function countDisputes(
  tenantId: string,
  filters?: DisputeFilters
): Promise<number> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status
  }

  return await db.collection('disputes').countDocuments(query)
}

/**
 * Get dispute statistics for a tenant
 * @param defaultCurrency - Default currency to use if no disputes exist (P2 fix: no longer hardcoded)
 */
export async function getDisputeStats(tenantId: string, defaultCurrency: string = 'AUD'): Promise<DisputeStats> {
  const db = await getDatabase()

  // Aggregate by status and also find the most common currency
  const result = await db.collection('disputes').aggregate([
    { $match: { tenantId } },
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: '$status',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            }
          }
        ],
        currencyInfo: [
          {
            $group: {
              _id: '$currency',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ]
      }
    }
  ]).toArray()

  const statusResults = result[0]?.byStatus || []
  const currencyResult = result[0]?.currencyInfo?.[0]
  const currency = currencyResult?._id || defaultCurrency

  const statusMap = new Map<string, { total: number; count: number }>(
    statusResults.map((r: any) => [r._id, { total: r.total, count: r.count }])
  )

  const needsResponse = statusMap.get('needs_response') || { total: 0, count: 0 }
  const underReview = statusMap.get('under_review') || { total: 0, count: 0 }
  const won = statusMap.get('won') || { total: 0, count: 0 }
  const lost = statusMap.get('lost') || { total: 0, count: 0 }
  const chargeRefunded = statusMap.get('charge_refunded') || { total: 0, count: 0 }
  const warningClosed = statusMap.get('warning_closed') || { total: 0, count: 0 }

  const totalCount = statusResults.reduce((sum: number, r: any) => sum + r.count, 0)
  const totalAmount = statusResults.reduce((sum: number, r: any) => sum + r.total, 0)

  return {
    needsResponse: needsResponse.count,
    underReview: underReview.count,
    won: won.count,
    lost: lost.count,
    total: totalCount,
    totalAmountDisputed: totalAmount,
    currency,
  }
}

/**
 * Get disputes that need response (urgent)
 */
export async function getDisputesNeedingResponse(tenantId: string): Promise<Dispute[]> {
  const db = await getDatabase()

  const results = await db.collection('disputes')
    .find({
      tenantId,
      status: 'needs_response',
    })
    .sort({ evidenceDueBy: 1 }) // Closest deadline first
    .toArray()

  return results as unknown as Dispute[]
}

/**
 * Get recent disputes (for dashboard display)
 */
export async function getRecentDisputes(
  tenantId: string,
  limit = 5
): Promise<Dispute[]> {
  const db = await getDatabase()

  const results = await db.collection('disputes')
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return results as unknown as Dispute[]
}
