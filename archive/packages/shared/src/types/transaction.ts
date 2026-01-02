/**
 * Transaction - Financial transaction records for the ledger
 * All monetary amounts are stored in cents (AUD) to avoid floating point issues
 */

/**
 * Type of financial transaction
 */
export type TransactionType = 'sale' | 'refund' | 'payout' | 'fee' | 'adjustment'

/**
 * Current status of the transaction
 */
export type TransactionStatus = 'pending' | 'completed' | 'failed'

/**
 * Fee breakdown for a transaction
 * Note: platform fee is always 0 for MadeBuy - this is our key differentiator
 */
export interface TransactionFees {
  stripe: number      // Stripe processing fee in cents
  platform: number    // Always 0 for MadeBuy - our differentiator
  total: number       // Total fees in cents
}

/**
 * Financial transaction record
 * Used for tracking all money movement: sales, refunds, payouts, adjustments
 */
export interface Transaction {
  id: string
  tenantId: string
  orderId?: string
  type: TransactionType

  // Amounts in cents (AUD)
  gross: number       // Total amount before fees
  fees: TransactionFees
  net: number         // Amount after fees (what seller receives)

  currency: string    // ISO currency code (default 'AUD')
  status: TransactionStatus

  // Stripe references
  stripePaymentIntentId?: string
  stripeChargeId?: string
  stripeBalanceTransactionId?: string
  stripeRefundId?: string
  stripeTransferId?: string

  // Description for ledger display
  description: string

  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  processedAt?: Date  // When the transaction was actually processed
}

/**
 * Input for creating a new transaction
 */
export interface CreateTransactionInput {
  type: TransactionType
  gross: number
  fees: TransactionFees
  net: number
  currency?: string
  status?: TransactionStatus
  description: string
  orderId?: string
  stripePaymentIntentId?: string
  stripeChargeId?: string
  stripeBalanceTransactionId?: string
  stripeRefundId?: string
  stripeTransferId?: string
  metadata?: Record<string, unknown>
  processedAt?: Date
}

/**
 * Filters for querying transactions
 */
export interface TransactionFilters {
  type?: TransactionType | TransactionType[]
  status?: TransactionStatus
  orderId?: string
  search?: string  // Search description and orderId
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'gross' | 'net'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Summary of transactions for a period
 */
export interface TransactionSummary {
  totalGross: number
  totalFees: number
  totalNet: number
  salesCount: number
  refundCount: number
  refundAmount: number
}

/**
 * Daily revenue data point for charts
 */
export interface DailyRevenueData {
  date: string  // YYYY-MM-DD
  gross: number
  net: number
  count: number
}
