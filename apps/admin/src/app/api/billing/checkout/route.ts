import { tenants } from '@madebuy/db'
import type { Plan } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'

// Validate Stripe secret key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Stripe Price IDs for each plan (configured in Stripe Dashboard)
// These should match the prices you create in Stripe
const STRIPE_PRICE_IDS: Partial<Record<Plan, string>> = {
  maker: process.env.STRIPE_PRICE_MAKER_MONTHLY,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  studio: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
}

const _PLAN_TO_DISPLAY_NAME: Record<Plan, string> = {
  free: 'Starter',
  maker: 'Maker',
  professional: 'Professional',
  studio: 'Studio',
}

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId } = await request.json()

    // Validate plan
    if (!planId || !['maker', 'professional', 'studio'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 },
      )
    }

    // Can't downgrade to free via checkout
    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Use the cancel subscription endpoint to downgrade to free' },
        { status: 400 },
      )
    }

    // Get price ID for selected plan
    const priceId = STRIPE_PRICE_IDS[planId as Plan]
    if (!priceId) {
      return NextResponse.json(
        {
          error: 'Subscription pricing not configured. Please contact support.',
        },
        { status: 500 },
      )
    }

    // PAY-13: Check if tenant already has an active subscription
    if (tenant.subscriptionId) {
      // Tenant already has a subscription - they should use the billing portal to manage it
      return NextResponse.json(
        {
          error: 'You already have an active subscription. Use the billing portal to change plans.',
          code: 'SUBSCRIPTION_EXISTS',
        },
        { status: 400 },
      )
    }

    // Get or create Stripe customer
    let customerId = tenant.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.businessName || tenant.email,
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      })
      customerId = customer.id

      // Save customer ID to tenant
      await tenants.updateTenant(tenant.id, { stripeCustomerId: customerId })
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3300'
    const successUrl = `${baseUrl}/dashboard/settings/billing?success=true&plan=${planId}`
    const cancelUrl = `${baseUrl}/dashboard/settings/billing?canceled=true`

    // PAY-08: Add idempotency key to prevent duplicate subscription checkout sessions
    const idempotencyKey = `subscription_${tenant.id}_${planId}_${Date.now()}`

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          planId,
        },
      },
      metadata: {
        tenantId: tenant.id,
        planId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Allow Stripe to update customer name/address during checkout (required for tax_id_collection)
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      tax_id_collection: {
        enabled: true,
      },
    }, {
      idempotencyKey,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing checkout error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create checkout session',
      },
      { status: 500 },
    )
  }
}
