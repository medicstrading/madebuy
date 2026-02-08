import { tenants } from '@madebuy/db'
import type {
  CreateStripeConnectInput,
  StripeConnectStatus,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  })
}

/**
 * GET /api/stripe/connect
 * Get current Stripe Connect account status
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if tenant has Stripe Connect configured
    const connectAccountId = tenant.paymentConfig?.stripe?.connectAccountId
    if (!connectAccountId) {
      return NextResponse.json({
        connected: false,
        status: null,
      })
    }

    // Fetch current account status from Stripe
    const account = await getStripe().accounts.retrieve(connectAccountId)

    const status: StripeConnectStatus = {
      connectAccountId: account.id,
      status: getAccountStatus(account),
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      onboardingComplete: account.details_submitted ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      businessType: account.business_type as
        | 'individual'
        | 'company'
        | undefined,
      requirements: account.requirements
        ? {
            currentlyDue: account.requirements.currently_due ?? [],
            eventuallyDue: account.requirements.eventually_due ?? [],
            pastDue: account.requirements.past_due ?? [],
            disabledReason: account.requirements.disabled_reason ?? undefined,
          }
        : undefined,
      createdAt: tenant.paymentConfig?.stripe?.createdAt ?? new Date(),
      updatedAt: new Date(),
    }

    // Update stored status if changed
    await tenants.updateStripeConnectStatus(tenant.id, status)

    return NextResponse.json({
      connected: true,
      ...status,
    })
  } catch (error) {
    console.error('Failed to get Stripe Connect status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe Connect status' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/stripe/connect
 * Create a new Stripe Connect Express account
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already connected
    if (tenant.paymentConfig?.stripe?.connectAccountId) {
      return NextResponse.json(
        { error: 'Stripe Connect account already exists' },
        { status: 400 },
      )
    }

    const body: CreateStripeConnectInput = await request.json()
    const { businessType } = body

    if (!businessType || !['individual', 'company'].includes(businessType)) {
      return NextResponse.json(
        { error: 'Invalid business type. Must be "individual" or "company"' },
        { status: 400 },
      )
    }

    // Create Stripe Express account
    const account = await getStripe().accounts.create({
      type: 'express',
      country: 'AU',
      email: tenant.email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    })

    // Initialize payment config if needed and save Connect account
    await tenants.initializePaymentConfig(tenant.id)

    const status: StripeConnectStatus = {
      connectAccountId: account.id,
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
      detailsSubmitted: false,
      businessType,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await tenants.updateStripeConnectStatus(tenant.id, status)

    return NextResponse.json({
      accountId: account.id,
      status: 'pending',
      message:
        'Stripe Connect account created. Complete onboarding to start accepting payments.',
    })
  } catch (error) {
    console.error('Failed to create Stripe Connect account:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/stripe/connect
 * Disconnect Stripe Connect account
 */
export async function DELETE() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!tenant.paymentConfig?.stripe?.connectAccountId) {
      return NextResponse.json(
        { error: 'No Stripe Connect account to disconnect' },
        { status: 400 },
      )
    }

    // Remove from tenant (don't delete the Stripe account itself)
    await tenants.removeStripeConnect(tenant.id)

    return NextResponse.json({
      success: true,
      message: 'Stripe Connect account disconnected',
    })
  } catch (error) {
    console.error('Failed to disconnect Stripe Connect:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Stripe Connect' },
      { status: 500 },
    )
  }
}

/**
 * Determine account status from Stripe account object
 */
function getAccountStatus(
  account: Stripe.Account,
): StripeConnectStatus['status'] {
  if (account.requirements?.disabled_reason) {
    return 'disabled'
  }
  if (
    account.requirements?.currently_due?.length ||
    account.requirements?.past_due?.length
  ) {
    return 'restricted'
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return 'active'
  }
  return 'pending'
}
