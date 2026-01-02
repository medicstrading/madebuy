import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  CreateTransactionInput,
  TransactionFilters,
  TransactionSummary,
  DailyRevenueData,
} from '@madebuy/shared'

const COLLECTION = 'transactions'

/**
 * Create a new transaction
 * CRITICAL: tenantId is required for multi-tenant isolation
 */
export async function createTransaction(
  tenantId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  const db = await getDatabase()

  const transaction: Transaction = {
    id: nanoid(),
    tenantId,
    type: input.type,
    status: input.status || 'pending',
    description: input.description,
    gross: input.gross,
    fees: input.fees,
    net: input.net,
    currency: input.currency || 'AUD',
    orderId: input.orderId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    stripeChargeId: input.stripeChargeId,
    stripeBalanceTransactionId: input.stripeBalanceTransactionId,
    stripeRefundId: input.stripeRefundId,
    stripeTransferId: input.stripeTransferId,
    metadata: input.metadata,
    processedAt: input.processedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection(COLLECTION).insertOne(transaction)
  return transaction
}

/**
 * Get transaction by ID
 * CRITICAL: Always filter by tenantId for security
 */
export async function getTransactionById(
  tenantId: string,
  transactionId: string
): Promise<Transaction | null> {
  const db = await getDatabase()
  return (await db.collection(COLLECTION).findOne({
    tenantId,
    id: transactionId,
  })) as Transaction | null
}

/**
 * Get transaction by Stripe Payment Intent ID
 * Used by webhook handlers
 */
export async function getTransactionByStripePaymentIntentId(
  paymentIntentId: string
): Promise<Transaction | null> {
  const db = await getDatabase()
  return (await db.collection(COLLECTION).findOne({
    stripePaymentIntentId: paymentIntentId,
  })) as Transaction | null
}

/**
 * List transactions with filtering and pagination
 * CRITICAL: Always filter by tenantId first for security
 */
export async function listTransactions(
  tenantId: string,
  options?: TransactionFilters
): Promise<{ transactions: Transaction[]; total: number }> {
  const db = await getDatabase()

  // Build filter - ALWAYS start with tenantId
  const filter: Record<string, unknown> = { tenantId }

  if (options?.type) {
    if (Array.isArray(options.type)) {
      filter.type = { $in: options.type }
    } else {
      filter.type = options.type
    }
  }

  if (options?.status) {
    filter.status = options.status
  }

  if (options?.orderId) {
    filter.orderId = options.orderId
  }

  // Search by description or orderId
  if (options?.search) {
    const searchRegex = { $regex: options.search, $options: 'i' }
    filter.$or = [
      { description: searchRegex },
      { orderId: searchRegex },
    ]
  }

  if (options?.startDate || options?.endDate) {
    filter.createdAt = {}
    if (options.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = options.startDate
    }
    if (options.endDate) {
      (filter.createdAt as Record<string, unknown>).$lte = options.endDate
    }
  }

  // Determine sort field and order
  const sortField = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1

  // Get total count
  const total = await db.collection(COLLECTION).countDocuments(filter)

  // Build query with pagination
  const cursor = db
    .collection(COLLECTION)
    .find(filter)
    .sort({ [sortField]: sortOrder })

  if (options?.offset) {
    cursor.skip(options.offset)
  }

  if (options?.limit) {
    cursor.limit(options.limit)
  }

  const transactions = (await cursor.toArray()) as unknown as Transaction[]

  return { transactions, total }
}

/**
 * Get transactions by order ID
 * CRITICAL: Always filter by tenantId for security
 */
export async function getTransactionsByOrder(
  tenantId: string,
  orderId: string
): Promise<Transaction[]> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .find({ tenantId, orderId })
    .sort({ createdAt: -1 })
    .toArray()) as unknown as Transaction[]
}

/**
 * Update transaction status (for webhook updates)
 * CRITICAL: Always filter by tenantId for security
 */
export async function updateTransactionStatus(
  tenantId: string,
  transactionId: string,
  status: TransactionStatus,
  additionalUpdates?: Partial<Pick<Transaction, 'stripeRefundId' | 'stripeTransferId' | 'processedAt' | 'metadata'>>
): Promise<Transaction | null> {
  const db = await getDatabase()

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { tenantId, id: transactionId },
    {
      $set: {
        status,
        ...additionalUpdates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )

  return result as Transaction | null
}

/**
 * Get transaction summary for a period
 * CRITICAL: Always filter by tenantId for security
 */
export async function getTransactionSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<TransactionSummary> {
  const db = await getDatabase()

  const result = await db
    .collection(COLLECTION)
    .aggregate([
      {
        $match: {
          tenantId,
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$gross' },
          totalFees: { $sum: '$fees.total' },
          totalNet: { $sum: '$net' },
          salesCount: {
            $sum: { $cond: [{ $eq: ['$type', 'sale'] }, 1, 0] },
          },
          refundCount: {
            $sum: { $cond: [{ $eq: ['$type', 'refund'] }, 1, 0] },
          },
          refundAmount: {
            $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$gross', 0] },
          },
        },
      },
    ])
    .toArray()

  if (result.length === 0) {
    return {
      totalGross: 0,
      totalFees: 0,
      totalNet: 0,
      salesCount: 0,
      refundCount: 0,
      refundAmount: 0,
    }
  }

  return {
    totalGross: result[0].totalGross,
    totalFees: result[0].totalFees,
    totalNet: result[0].totalNet,
    salesCount: result[0].salesCount,
    refundCount: result[0].refundCount,
    refundAmount: Math.abs(result[0].refundAmount), // Refunds are stored as negative
  }
}

/**
 * Get daily revenue for a date range (for charts)
 * CRITICAL: Always filter by tenantId for security
 */
export async function getDailyRevenue(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyRevenueData[]> {
  const db = await getDatabase()

  const result = await db
    .collection(COLLECTION)
    .aggregate([
      {
        $match: {
          tenantId,
          status: 'completed',
          type: 'sale', // Only count sales for revenue
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          gross: { $sum: '$gross' },
          net: { $sum: '$net' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])
    .toArray()

  // Fill in missing dates with zero values
  const revenueMap = new Map(result.map(r => [r._id, r]))
  const dailyRevenue: DailyRevenueData[] = []

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const data = revenueMap.get(dateStr)
    dailyRevenue.push({
      date: dateStr,
      gross: data?.gross || 0,
      net: data?.net || 0,
      count: data?.count || 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dailyRevenue
}

/**
 * Get revenue breakdown by transaction type for a period
 */
export async function getRevenueByType(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ type: TransactionType; gross: number; net: number; count: number }>> {
  const db = await getDatabase()

  const result = await db
    .collection(COLLECTION)
    .aggregate([
      {
        $match: {
          tenantId,
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          gross: { $sum: '$gross' },
          net: { $sum: '$net' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { gross: -1 },
      },
    ])
    .toArray()

  return result.map(r => ({
    type: r._id as TransactionType,
    gross: r.gross,
    net: r.net,
    count: r.count,
  }))
}

/**
 * Link transaction to a payout
 */
export async function linkTransactionToPayout(
  tenantId: string,
  transactionId: string,
  payoutId: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection(COLLECTION).updateOne(
    { tenantId, id: transactionId },
    {
      $set: {
        payoutId,
        updatedAt: new Date(),
      },
    }
  )
}

/**
 * Get unpaid transactions (for payout calculation)
 * Returns completed sales that haven't been linked to a payout yet
 */
export async function getUnpaidTransactions(
  tenantId: string
): Promise<Transaction[]> {
  const db = await getDatabase()
  return (await db
    .collection(COLLECTION)
    .find({
      tenantId,
      type: 'sale',
      status: 'completed',
      payoutId: { $exists: false },
    })
    .sort({ createdAt: 1 })
    .toArray()) as unknown as Transaction[]
}

/**
 * Count transactions for a tenant
 */
export async function countTransactions(
  tenantId: string,
  filters?: { type?: TransactionType; status?: TransactionStatus }
): Promise<number> {
  const db = await getDatabase()

  const filter: Record<string, unknown> = { tenantId }

  if (filters?.type) {
    filter.type = filters.type
  }

  if (filters?.status) {
    filter.status = filters.status
  }

  return await db.collection(COLLECTION).countDocuments(filter)
}

/**
 * Create indexes for performance
 * Called during database initialization
 */
export async function createIndexes(): Promise<void> {
  const db = await getDatabase()
  const col = db.collection(COLLECTION)

  // Primary indexes - tenantId is always first for security
  await col.createIndex({ tenantId: 1, createdAt: -1 })
  await col.createIndex({ tenantId: 1, type: 1 })
  await col.createIndex({ tenantId: 1, status: 1 })
  await col.createIndex({ tenantId: 1, orderId: 1 })

  // Stripe lookups (sparse because not all transactions have these)
  await col.createIndex({ stripePaymentIntentId: 1 }, { sparse: true })
  await col.createIndex({ stripeBalanceTransactionId: 1 }, { sparse: true })
  await col.createIndex({ stripeChargeId: 1 }, { sparse: true })

  // Payout lookups
  await col.createIndex({ tenantId: 1, payoutId: 1 }, { sparse: true })

  // For unpaid transactions query
  await col.createIndex(
    { tenantId: 1, type: 1, status: 1, payoutId: 1 },
    { partialFilterExpression: { type: 'sale', status: 'completed' } }
  )
}
