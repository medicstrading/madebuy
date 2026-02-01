import { PLAN_NAMES, PLAN_PRICES } from '@madebuy/shared'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { getSubscriptionSummary } from '@/lib/subscription-check'

/**
 * GET /api/subscription
 * Get current subscription status and limits
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getSubscriptionSummary(tenant)

    return NextResponse.json({
      ...summary,
      pricing: PLAN_PRICES,
      planNames: PLAN_NAMES,
      stripeCustomerId: tenant.stripeCustomerId ? 'configured' : null,
      subscriptionId: tenant.subscriptionId ? 'active' : null,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 },
    )
  }
}
