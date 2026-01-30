import {
  createLogger,
  isMadeBuyError,
  toErrorResponse,
  UnauthorizedError,
  ValidationError,
  ExternalServiceError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'

const log = createLogger({ module: 'billing-portal' })

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
      throw new UnauthorizedError()
    }

    // Tenant must have a Stripe customer ID to access portal
    if (!tenant.stripeCustomerId) {
      throw new ValidationError('No billing account found. Subscribe to a plan first.')
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
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json({ error: msg, code, details }, { status: statusCode })
    }

    // Catch Stripe errors as external service errors
    if (error instanceof Stripe.errors.StripeError) {
      log.error({ err: error }, 'Stripe API error')
      throw new ExternalServiceError('Stripe', error.message)
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected billing portal error')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
