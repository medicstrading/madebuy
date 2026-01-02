/**
 * Payout - Seller payout records from Stripe Connect
 * Tracks money transfers from MadeBuy to seller bank accounts
 */

/**
 * Current status of the payout
 */
export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'

/**
 * Payout method type
 */
export type PayoutMethod = 'standard' | 'instant'

/**
 * Payout record for seller disbursements
 * Created when Stripe transfers funds to a seller's connected bank account
 */
export interface Payout {
  id: string
  tenantId: string
  stripePayoutId: string

  // Amount in cents (AUD)
  amount: number
  currency: string    // ISO currency code (default 'AUD')
  status: PayoutStatus

  // Bank account details (masked for display)
  destinationLast4?: string
  destinationBankName?: string

  // Dates
  arrivalDate: Date      // Expected or actual arrival date
  initiatedAt: Date      // When the payout was initiated

  // Links to transactions included in this payout
  transactionIds: string[]

  // Payout method
  method?: PayoutMethod

  // Failure info if failed
  failureCode?: string
  failureMessage?: string

  // Metadata
  description?: string
  statementDescriptor?: string

  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a new payout record
 */
export interface CreatePayoutInput {
  stripePayoutId: string
  amount: number
  currency?: string
  status: PayoutStatus
  arrivalDate?: Date
  initiatedAt: Date
  transactionIds?: string[]
  destinationLast4?: string
  destinationBankName?: string
  method?: PayoutMethod
  description?: string
  statementDescriptor?: string
}

/**
 * Filters for querying payouts
 */
export interface PayoutFilters {
  status?: PayoutStatus | PayoutStatus[]
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Payout summary for dashboard display
 */
export interface PayoutSummary {
  pendingAmount: number       // Total pending payouts in cents
  inTransitAmount: number     // Amount currently in transit
  lastPayoutAmount: number    // Most recent payout in cents
  lastPayoutDate?: Date       // Date of most recent payout
  nextPayoutDate?: Date       // Expected next payout date
  totalPaidOut: number        // Lifetime payouts in cents
}

/**
 * Payout statistics for analytics
 */
export interface PayoutStats {
  totalPaid: number
  payoutCount: number
  averagePayoutAmount: number
  failedCount: number
}
