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
  grossAmount: number      // Total charged to customer (GST inclusive if applicable)
  stripeFee: number        // Stripe's processing fee (~2.9% + 30c)
  platformFee: number      // MadeBuy's cut (0 for zero-fee model)
  netAmount: number        // What seller receives (grossAmount - fees)

  // GST/Tax breakdown (for GST-registered sellers)
  gstAmount?: number       // GST component of grossAmount (in cents)
  gstRate?: number         // GST rate applied (e.g., 10 for 10%)

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
  gstAmount?: number
  gstRate?: number
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
  totalGst: number         // Total GST collected (for GST-registered tenants)
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

/**
 * Calculate GST from a GST-inclusive amount
 * For Australian GST at 10%, GST = price / 11
 *
 * @param inclusiveAmountCents - Total price including GST (in cents)
 * @param gstRate - GST rate (default 10 for 10%)
 * @returns GST amount in cents
 */
export function calculateGstFromInclusive(inclusiveAmountCents: number, gstRate = 10): number {
  // GST = inclusive / (1 + rate/100) * (rate/100)
  // For 10%: GST = inclusive / 11
  const divisor = 1 + gstRate / 100
  const gst = inclusiveAmountCents - (inclusiveAmountCents / divisor)
  return Math.round(gst)
}

/**
 * Calculate GST to add to a GST-exclusive amount
 *
 * @param exclusiveAmountCents - Price before GST (in cents)
 * @param gstRate - GST rate (default 10 for 10%)
 * @returns GST amount in cents
 */
export function calculateGstFromExclusive(exclusiveAmountCents: number, gstRate = 10): number {
  return Math.round(exclusiveAmountCents * (gstRate / 100))
}

/**
 * Get the GST-exclusive amount from a GST-inclusive amount
 *
 * @param inclusiveAmountCents - Total price including GST (in cents)
 * @param gstRate - GST rate (default 10 for 10%)
 * @returns Amount excluding GST in cents
 */
export function getExclusiveAmount(inclusiveAmountCents: number, gstRate = 10): number {
  const divisor = 1 + gstRate / 100
  return Math.round(inclusiveAmountCents / divisor)
}

/**
 * Quarterly GST Report for BAS (Business Activity Statement)
 * Used by Australian GST-registered sellers
 */
export interface QuarterlyGSTReport {
  quarter: string            // e.g., "2024-Q1"
  year: number               // e.g., 2024
  quarterNumber: number      // 1-4
  startDate: Date
  endDate: Date

  // GST Collected (from sales)
  gstCollected: number       // Total GST collected on sales (in cents)
  salesCount: number         // Number of sales in period
  salesGross: number         // Total gross sales (in cents)
  salesNet: number           // Total net sales after GST (in cents)

  // GST Paid (on expenses/refunds)
  gstPaid: number            // GST paid on refunds (in cents)
  refundsCount: number       // Number of refunds
  refundsTotal: number       // Total refund amount (in cents)

  // Net GST Position
  netGst: number             // gstCollected - gstPaid (what to remit to ATO)

  // Additional context
  currency: string           // Usually 'AUD'
  gstRate: number            // The GST rate used (usually 10)
}

/**
 * Parse a quarter string (e.g., "2024-Q1") to start and end dates
 */
export function parseQuarter(quarterString: string): { startDate: Date; endDate: Date; year: number; quarter: number } | null {
  const match = quarterString.match(/^(\d{4})-Q([1-4])$/)
  if (!match) return null

  const year = parseInt(match[1], 10)
  const quarter = parseInt(match[2], 10)

  // Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
  const startMonth = (quarter - 1) * 3 // 0, 3, 6, 9
  const endMonth = startMonth + 2      // 2, 5, 8, 11

  const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0)
  // End of last day of quarter
  const endDate = new Date(year, endMonth + 1, 0, 23, 59, 59, 999)

  return { startDate, endDate, year, quarter }
}

/**
 * Get the current quarter string
 */
export function getCurrentQuarter(): string {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `${year}-Q${quarter}`
}
