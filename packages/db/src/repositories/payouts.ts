import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Payout,
  PayoutStatus,
  CreatePayoutInput,
  PayoutFilters,
  PayoutListOptions,
  PayoutSummary,
} from '@madebuy/shared'

/**
 * Create a new payout record
 */
export async function createPayout(data: CreatePayoutInput): Promise<Payout> {
  const db = await getDatabase()

  const payout: Payout = {
    id: nanoid(),
    tenantId: data.tenantId,
    stripePayoutId: data.stripePayoutId,
    amount: data.amount,
    currency: data.currency || 'AUD',
    status: data.status,
    bankLast4: data.bankLast4,
    bankName: data.bankName,
    arrivalDate: data.arrivalDate,
    description: data.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('payouts').insertOne(payout)
  return payout
}

/**
 * Get a payout by ID
 */
export async function getPayout(
  tenantId: string,
  id: string
): Promise<Payout | null> {
  const db = await getDatabase()
  return await db.collection('payouts').findOne({ tenantId, id }) as Payout | null
}

/**
 * Get a payout by Stripe payout ID
 */
export async function getPayoutByStripeId(
  stripePayoutId: string
): Promise<Payout | null> {
  const db = await getDatabase()
  return await db.collection('payouts').findOne({ stripePayoutId }) as Payout | null
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  stripePayoutId: string,
  status: PayoutStatus,
  extra?: Partial<Pick<Payout, 'paidAt' | 'failedAt' | 'canceledAt' | 'failureCode' | 'failureMessage'>>
): Promise<void> {
  const db = await getDatabase()

  const updates: any = {
    status,
    updatedAt: new Date(),
  }

  if (extra) {
    Object.assign(updates, extra)
  }

  await db.collection('payouts').updateOne(
    { stripePayoutId },
    { $set: updates }
  )
}

/**
 * List payouts for a tenant
 */
export async function listPayouts(
  tenantId: string,
  options?: PayoutListOptions
): Promise<Payout[]> {
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

  let cursor = db.collection('payouts')
    .find(query)
    .sort({ [sortField]: sortOrder })

  if (options?.offset) {
    cursor = cursor.skip(options.offset)
  }

  cursor = cursor.limit(options?.limit || 50)

  const results = await cursor.toArray()
  return results as unknown as Payout[]
}

/**
 * Get payout summary for a tenant
 */
export async function getPayoutSummary(tenantId: string): Promise<PayoutSummary> {
  const db = await getDatabase()

  const result = await db.collection('payouts').aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      }
    }
  ]).toArray()

  const statusMap = new Map(result.map(r => [r._id, { total: r.total, count: r.count }]))

  const paid = statusMap.get('paid') || { total: 0, count: 0 }
  const pending = statusMap.get('pending') || { total: 0, count: 0 }
  const inTransit = statusMap.get('in_transit') || { total: 0, count: 0 }
  const failed = statusMap.get('failed') || { total: 0, count: 0 }

  return {
    totalPaid: paid.total,
    totalPending: pending.total + inTransit.total,
    totalFailed: failed.total,
    count: {
      paid: paid.count,
      pending: pending.count,
      inTransit: inTransit.count,
      failed: failed.count,
    },
    currency: 'AUD',
  }
}

/**
 * Count payouts for a tenant
 */
export async function countPayouts(
  tenantId: string,
  filters?: PayoutFilters
): Promise<number> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status
  }

  return await db.collection('payouts').countDocuments(query)
}

/**
 * Get recent payouts (for dashboard display)
 */
export async function getRecentPayouts(
  tenantId: string,
  limit = 5
): Promise<Payout[]> {
  const db = await getDatabase()

  const results = await db.collection('payouts')
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return results as unknown as Payout[]
}
