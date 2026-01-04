/**
 * Transaction - Financial ledger for all money movement
 * Tracks sales, refunds, payouts, and subscription payments
 */

export type TransactionType = 'sale' | 'refund' | 'payout' | 'fee' | 'subscription'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export interface Transaction {
  id: string
  tenantId: string
  orderId?: string  // For sale/refund transactions

  type: TransactionType

  // Money amounts (all in cents)
  grossAmount: number      // Total charged to customer
  stripeFee: number        // Stripe's processing fee (~2.9% + 30c)
  platformFee: number      // MadeBuy's cut (0 for zero-fee model)
  netAmount: number        // What seller receives (grossAmount - fees)

  currency: string         // 'aud', 'usd', etc.

  // Stripe references
  stripePaymentIntentId?: string
  stripeTransferId?: string
  stripePayoutId?: string
  stripeRefundId?: string
  stripeSubscriptionId?: string

  // Status tracking
  status: TransactionStatus

  // Description for ledger display
  description?: string

  // Timestamps
  createdAt: Date
  completedAt?: Date
  updatedAt?: Date
}

export interface CreateTransactionInput {
  tenantId: string
  orderId?: string
  type: TransactionType
  grossAmount: number
  stripeFee: number
  platformFee: number
  netAmount: number
  currency?: string
  stripePaymentIntentId?: string
  stripeTransferId?: string
  stripePayoutId?: string
  stripeRefundId?: string
  stripeSubscriptionId?: string
  status: TransactionStatus
  description?: string
  completedAt?: Date
}

export interface TransactionFilters {
  type?: TransactionType | TransactionType[]
  status?: TransactionStatus
  startDate?: Date
  endDate?: Date
  orderId?: string
}

export interface TransactionListOptions {
  filters?: TransactionFilters
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

export interface TenantBalance {
  totalGross: number       // Total revenue before fees
  totalStripeFees: number  // Total Stripe processing fees
  totalPlatformFees: number // Total platform fees (0 for MadeBuy)
  totalNet: number         // Total net after all fees
  totalPayouts: number     // Total paid out to bank
  pendingBalance: number   // Net - payouts = available for payout
  currency: string
}

export interface TransactionSummary {
  period: 'day' | 'week' | 'month' | 'year' | 'all'
  startDate: Date
  endDate: Date
  sales: {
    count: number
    gross: number
    fees: number
    net: number
  }
  refunds: {
    count: number
    amount: number
  }
  payouts: {
    count: number
    amount: number
  }
}

/**
 * Calculate estimated Stripe fee for Australia
 * Domestic cards: 1.7% + A$0.30
 * International cards: 2.9% + A$0.30
 * We use 2.5% + 30c as a conservative average
 */
export function calculateStripeFee(amountCents: number, isInternational = false): number {
  const percentage = isInternational ? 0.029 : 0.017
  const fixedFee = 30 // 30 cents
  return Math.round(amountCents * percentage + fixedFee)
}
