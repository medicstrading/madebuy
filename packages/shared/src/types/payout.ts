/**
 * Payout - Tracks Stripe payouts to seller bank accounts
 * Records when money moves from Stripe balance to bank
 */

export type PayoutStatus =
  | 'pending'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'canceled'

export interface Payout {
  id: string
  tenantId: string
  stripePayoutId: string

  // Amount
  amount: number // In cents
  currency: string // 'aud', 'usd', etc.

  // Status
  status: PayoutStatus

  // Bank details (masked for security)
  bankLast4?: string
  bankName?: string

  // Timing
  createdAt: Date
  arrivalDate?: Date // Expected arrival
  paidAt?: Date // When actually paid
  failedAt?: Date
  canceledAt?: Date

  // Failure info
  failureCode?: string
  failureMessage?: string

  // Metadata
  description?: string
  updatedAt?: Date
}

export interface CreatePayoutInput {
  tenantId: string
  stripePayoutId: string
  amount: number
  currency?: string
  status: PayoutStatus
  arrivalDate?: Date
  bankLast4?: string
  bankName?: string
  description?: string
}

export interface PayoutFilters {
  status?: PayoutStatus | PayoutStatus[]
  startDate?: Date
  endDate?: Date
}

export interface PayoutListOptions {
  filters?: PayoutFilters
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'amount' | 'arrivalDate'
  sortOrder?: 'asc' | 'desc'
}

export interface PayoutSummary {
  totalPaid: number
  totalPending: number
  totalFailed: number
  count: {
    paid: number
    pending: number
    inTransit: number
    failed: number
  }
  currency: string
}
