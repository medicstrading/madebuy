import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session for subscription management
 * Allows customers to:
 * - Update payment methods
 * - View billing history / invoices
 * - Cancel subscription
 * - Update billing details
 */
export async function POST(_request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Tenant must have a Stripe customer ID to access portal
    if (!tenant.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 },
      )
    }

    // Build return URL
    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3300'
    const returnUrl = `${baseUrl}/dashboard/settings/billing`

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create portal session',
      },
      { status: 500 },
    )
  }
}
