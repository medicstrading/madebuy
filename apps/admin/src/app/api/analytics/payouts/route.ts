import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { payouts } from '@madebuy/db'
import type { Payout } from '@madebuy/shared'

export interface PayoutAnalyticsResponse {
  pendingAmount: number
  nextPayoutDate: string | null
  recentPayouts: Array<{
    id: string
    amount: number
    status: string
    arrivalDate: string
    destinationLast4?: string
  }>
  totalPaidOut: number
  hasConnectAccount: boolean
}

/**
 * GET /api/analytics/payouts
 * Get payout analytics for the dashboard widget
 *
 * Returns:
 * - pendingAmount: Total pending payout amount in cents
 * - nextPayoutDate: ISO date string of next expected payout
 * - recentPayouts: Last 3 payouts with essential details
 * - totalPaidOut: Total paid out this month in cents
 * - hasConnectAccount: Whether seller has Stripe Connect set up
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if tenant has Stripe Connect account
    const hasConnectAccount = Boolean(
      tenant.stripeConnectAccountId &&
        tenant.stripeConnectOnboardingComplete &&
        tenant.stripeConnectPayoutsEnabled
    )

    // If no Connect account, return empty state
    if (!hasConnectAccount) {
      return NextResponse.json({
        pendingAmount: 0,
        nextPayoutDate: null,
        recentPayouts: [],
        totalPaidOut: 0,
        hasConnectAccount: false,
      } satisfies PayoutAnalyticsResponse)
    }

    // Calculate this month's date range
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch all data in parallel
    const [pendingSummary, recentPayoutsResult, monthPayoutSummary] =
      await Promise.all([
        // Get pending payout info
        payouts.getPendingPayoutSummary(tenant.id),

        // Get recent payouts (last 3)
        payouts.listPayoutsByTenant(tenant.id, { limit: 3 }),

        // Get this month's payout summary
        payouts.getPayoutSummary(tenant.id, thisMonthStart, now),
      ])

    // Format recent payouts for response
    const recentPayouts = recentPayoutsResult.map((payout: Payout) => ({
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      arrivalDate: payout.arrivalDate
        ? new Date(payout.arrivalDate).toISOString()
        : new Date().toISOString(),
      destinationLast4: payout.destinationLast4,
    }))

    return NextResponse.json({
      pendingAmount:
        pendingSummary.pendingAmount + pendingSummary.inTransitAmount,
      nextPayoutDate: pendingSummary.nextPayoutDate
        ? new Date(pendingSummary.nextPayoutDate).toISOString()
        : null,
      recentPayouts,
      totalPaidOut: monthPayoutSummary.totalPaid,
      hasConnectAccount: true,
    } satisfies PayoutAnalyticsResponse)
  } catch (error) {
    console.error('Error fetching payout analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout analytics' },
      { status: 500 }
    )
  }
}
