/**
 * Dispute - Tracks chargebacks and payment disputes from Stripe
 * Records when customers dispute charges, requiring evidence submission
 */

export type DisputeStatus =
  | 'needs_response'     // Evidence needed from seller
  | 'under_review'       // Stripe/bank reviewing evidence
  | 'won'                // Dispute resolved in seller's favor
  | 'lost'               // Dispute resolved in customer's favor
  | 'charge_refunded'    // Charge was refunded, dispute closed
  | 'warning_closed'     // Early warning resolved

export type DisputeReason =
  | 'bank_cannot_process'
  | 'credit_not_processed'
  | 'customer_initiated'
  | 'debit_not_authorized'
  | 'duplicate'
  | 'fraudulent'
  | 'general'
  | 'incorrect_account_details'
  | 'insufficient_funds'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'subscription_canceled'
  | 'unrecognized'

export interface Dispute {
  id: string
  tenantId: string
  orderId?: string                // Linked order if we can identify it
  stripeDisputeId: string         // Stripe dispute ID (dp_xxx)
  stripeChargeId?: string         // Stripe charge ID (ch_xxx)

  // Amount
  amount: number                  // In cents
  currency: string                // 'aud', 'usd', etc.

  // Status and reason
  status: DisputeStatus
  reason: DisputeReason

  // Evidence timeline
  evidenceDueBy?: Date            // Deadline to submit evidence

  // Timestamps
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date               // When dispute was closed (won/lost)
}

export interface CreateDisputeInput {
  tenantId: string
  orderId?: string
  stripeDisputeId: string
  stripeChargeId?: string
  amount: number
  currency?: string
  status: DisputeStatus
  reason: DisputeReason
  evidenceDueBy?: Date
}

export interface UpdateDisputeInput {
  status?: DisputeStatus
  orderId?: string
  resolvedAt?: Date
}

export interface DisputeFilters {
  status?: DisputeStatus | DisputeStatus[]
  startDate?: Date
  endDate?: Date
}

export interface DisputeListOptions {
  filters?: DisputeFilters
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'amount' | 'evidenceDueBy'
  sortOrder?: 'asc' | 'desc'
}

export interface DisputeStats {
  needsResponse: number
  underReview: number
  won: number
  lost: number
  total: number
  totalAmountDisputed: number     // Total disputed amount (cents)
  currency: string
}
