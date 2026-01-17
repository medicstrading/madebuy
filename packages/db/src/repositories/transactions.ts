import type {
  CreateTransactionInput,
  QuarterlyGSTReport,
  TenantBalance,
  Transaction,
  TransactionFilters,
  TransactionListOptions,
  TransactionSummary,
} from '@madebuy/shared'
import { parseQuarter } from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

/**
 * Create a new transaction record
 */
export async function createTransaction(
  data: CreateTransactionInput,
): Promise<Transaction> {
  const db = await getDatabase()

  const transaction: Transaction = {
    id: nanoid(),
    tenantId: data.tenantId,
    orderId: data.orderId,
    type: data.type,
    grossAmount: data.grossAmount,
    stripeFee: data.stripeFee,
    platformFee: data.platformFee,
    netAmount: data.netAmount,
    gstAmount: data.gstAmount,
    gstRate: data.gstRate,
    currency: data.currency || 'AUD',
    stripePaymentIntentId: data.stripePaymentIntentId,
    stripeTransferId: data.stripeTransferId,
    stripePayoutId: data.stripePayoutId,
    stripeRefundId: data.stripeRefundId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    status: data.status,
    description: data.description,
    createdAt: new Date(),
    completedAt: data.completedAt,
    updatedAt: new Date(),
  }

  await db.collection('transactions').insertOne(transaction)
  return transaction
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  tenantId: string,
  id: string,
): Promise<Transaction | null> {
  const db = await getDatabase()
  return (await db
    .collection('transactions')
    .findOne({ tenantId, id })) as Transaction | null
}

/**
 * Get transaction by Stripe payment intent ID
 */
export async function getTransactionByPaymentIntent(
  stripePaymentIntentId: string,
): Promise<Transaction | null> {
  const db = await getDatabase()
  return (await db
    .collection('transactions')
    .findOne({ stripePaymentIntentId })) as Transaction | null
}

/**
 * Get transaction by order ID
 */
export async function getTransactionsByOrder(
  tenantId: string,
  orderId: string,
): Promise<Transaction[]> {
  const db = await getDatabase()
  const results = await db
    .collection('transactions')
    .find({ tenantId, orderId })
    .sort({ createdAt: -1 })
    .toArray()
  return results as unknown as Transaction[]
}

/**
 * List transactions with filters and pagination
 */
export async function listTransactions(
  tenantId: string,
  options?: TransactionListOptions,
): Promise<Transaction[]> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (options?.filters) {
    const { type, status, startDate, endDate, orderId } = options.filters

    if (type) {
      query.type = Array.isArray(type) ? { $in: type } : type
    }

    if (status) {
      query.status = status
    }

    if (orderId) {
      query.orderId = orderId
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = startDate
      if (endDate) query.createdAt.$lte = endDate
    }
  }

  const sortField = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1

  let cursor = db
    .collection('transactions')
    .find(query)
    .sort({ [sortField]: sortOrder })

  if (options?.offset) {
    cursor = cursor.skip(options.offset)
  }

  cursor = cursor.limit(options?.limit || 100)

  const results = await cursor.toArray()
  return results as unknown as Transaction[]
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  id: string,
  status: Transaction['status'],
  completedAt?: Date,
): Promise<void> {
  const db = await getDatabase()

  const updates: any = {
    status,
    updatedAt: new Date(),
  }

  if (completedAt) {
    updates.completedAt = completedAt
  }

  await db.collection('transactions').updateOne({ id }, { $set: updates })
}

/**
 * Get tenant's current balance and totals
 * Optionally filtered by date range and transaction type
 */
export async function getTenantBalance(
  tenantId: string,
  filters?: TransactionFilters,
): Promise<TenantBalance> {
  const db = await getDatabase()

  // Build the match query
  const matchQuery: any = { tenantId, status: 'completed' }

  if (filters?.startDate || filters?.endDate) {
    matchQuery.createdAt = {}
    if (filters.startDate) matchQuery.createdAt.$gte = filters.startDate
    if (filters.endDate) matchQuery.createdAt.$lte = filters.endDate
  }

  if (filters?.type) {
    matchQuery.type = Array.isArray(filters.type)
      ? { $in: filters.type }
      : filters.type
  }

  const result = await db
    .collection('transactions')
    .aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossAmount' },
          totalStripeFees: { $sum: '$stripeFee' },
          totalPlatformFees: { $sum: '$platformFee' },
          totalNet: { $sum: '$netAmount' },
          // Sum GST collected (from sales only)
          totalGst: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'sale'] },
                    { $gt: ['$gstAmount', 0] },
                  ],
                },
                '$gstAmount',
                0,
              ],
            },
          },
          // Sum payouts (negative for balance calculation)
          totalPayouts: {
            $sum: {
              $cond: [{ $eq: ['$type', 'payout'] }, '$netAmount', 0],
            },
          },
          // Sum refunds (negative for balance calculation)
          totalRefunds: {
            $sum: {
              $cond: [{ $eq: ['$type', 'refund'] }, '$grossAmount', 0],
            },
          },
        },
      },
    ])
    .toArray()

  const data = result[0] || {
    totalGross: 0,
    totalStripeFees: 0,
    totalPlatformFees: 0,
    totalNet: 0,
    totalGst: 0,
    totalPayouts: 0,
    totalRefunds: 0,
  }

  // Calculate pending balance (net sales - payouts - refunds)
  const salesNet = data.totalNet - data.totalPayouts // Net from non-payout transactions
  const pendingBalance = salesNet - data.totalPayouts

  return {
    totalGross: data.totalGross - data.totalRefunds,
    totalStripeFees: data.totalStripeFees,
    totalPlatformFees: data.totalPlatformFees,
    totalNet: data.totalNet - data.totalPayouts,
    totalPayouts: data.totalPayouts,
    pendingBalance: Math.max(0, pendingBalance),
    totalGst: data.totalGst,
    currency: 'AUD',
  }
}

/**
 * Get transaction summary for a period
 */
export async function getTransactionSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<TransactionSummary> {
  const db = await getDatabase()

  const salesResult = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          tenantId,
          type: 'sale',
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: { $sum: '$grossAmount' },
          fees: { $sum: { $add: ['$stripeFee', '$platformFee'] } },
          net: { $sum: '$netAmount' },
        },
      },
    ])
    .toArray()

  const refundsResult = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          tenantId,
          type: 'refund',
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$grossAmount' },
        },
      },
    ])
    .toArray()

  const payoutsResult = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          tenantId,
          type: 'payout',
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$netAmount' },
        },
      },
    ])
    .toArray()

  const sales = salesResult[0] || { count: 0, gross: 0, fees: 0, net: 0 }
  const refunds = refundsResult[0] || { count: 0, amount: 0 }
  const payouts = payoutsResult[0] || { count: 0, amount: 0 }

  return {
    period: 'all',
    startDate,
    endDate,
    sales: {
      count: sales.count,
      gross: sales.gross,
      fees: sales.fees,
      net: sales.net,
    },
    refunds: {
      count: refunds.count,
      amount: refunds.amount,
    },
    payouts: {
      count: payouts.count,
      amount: payouts.amount,
    },
  }
}

/**
 * Count transactions for a tenant
 */
export async function countTransactions(
  tenantId: string,
  filters?: TransactionFilters,
): Promise<number> {
  const db = await getDatabase()

  const query: any = { tenantId }

  if (filters?.type) {
    query.type = Array.isArray(filters.type)
      ? { $in: filters.type }
      : filters.type
  }

  if (filters?.status) {
    query.status = filters.status
  }

  return await db.collection('transactions').countDocuments(query)
}

/**
 * Delete a transaction (admin only, for corrections)
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('transactions').deleteOne({ id })
}

/**
 * Get quarterly GST report for BAS (Business Activity Statement)
 * Aggregates GST collected from sales and GST paid on refunds
 */
export async function getQuarterlyGSTReport(
  tenantId: string,
  quarterString: string,
  gstRate = 10,
): Promise<QuarterlyGSTReport | null> {
  const parsed = parseQuarter(quarterString)
  if (!parsed) return null

  const { startDate, endDate, year, quarter } = parsed
  const db = await getDatabase()

  // Get GST collected from sales
  const salesResult = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          tenantId,
          type: 'sale',
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: { $sum: '$grossAmount' },
          gstCollected: {
            $sum: { $ifNull: ['$gstAmount', 0] },
          },
          net: { $sum: '$netAmount' },
        },
      },
    ])
    .toArray()

  // Get GST paid on refunds
  const refundsResult = await db
    .collection('transactions')
    .aggregate([
      {
        $match: {
          tenantId,
          type: 'refund',
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$grossAmount' },
          gstPaid: {
            $sum: { $ifNull: ['$gstAmount', 0] },
          },
        },
      },
    ])
    .toArray()

  const sales = salesResult[0] || {
    count: 0,
    gross: 0,
    gstCollected: 0,
    net: 0,
  }
  const refunds = refundsResult[0] || { count: 0, total: 0, gstPaid: 0 }

  // Calculate net sales after GST
  const salesNet = sales.gross - sales.gstCollected

  // Net GST = GST collected - GST refunded
  // Positive = owe ATO, Negative = ATO owes you
  const netGst = sales.gstCollected - refunds.gstPaid

  return {
    quarter: quarterString,
    year,
    quarterNumber: quarter,
    startDate,
    endDate,
    gstCollected: sales.gstCollected,
    salesCount: sales.count,
    salesGross: sales.gross,
    salesNet,
    gstPaid: refunds.gstPaid,
    refundsCount: refunds.count,
    refundsTotal: refunds.total,
    netGst,
    currency: 'AUD',
    gstRate,
  }
}
