import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'
import {
  createStripeClient,
  createConnectAccount,
  getAccountStatus,
  isAccountActive,
} from '@madebuy/shared/src/stripe'

function getStripe() {
  return createStripeClient(process.env.STRIPE_SECRET_KEY!)
}

// GET - Check Connect account status
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // No Connect account yet
    if (!tenant.stripeConnectAccountId) {
      return NextResponse.json({
        hasAccount: false,
        status: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      })
    }

    // Fetch current account status from Stripe
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(tenant.stripeConnectAccountId)
    const status = getAccountStatus(account)
    const active = isAccountActive(account)

    // Update tenant if status changed
    if (
      tenant.stripeConnectStatus !== status ||
      tenant.stripeConnectChargesEnabled !== account.charges_enabled ||
      tenant.stripeConnectPayoutsEnabled !== account.payouts_enabled ||
      tenant.stripeConnectOnboardingComplete !== account.details_submitted
    ) {
      await tenants.updateTenant(user.id, {
        stripeConnectStatus: status,
        stripeConnectChargesEnabled: account.charges_enabled,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        stripeConnectOnboardingComplete: account.details_submitted,
      })
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: tenant.stripeConnectAccountId,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: account.details_submitted,
      isActive: active,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error('Failed to get Connect status:', error)
    return NextResponse.json(
      { error: 'Failed to get Connect status' },
      { status: 500 }
    )
  }
}

// POST - Create new Connect account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Already has an account
    if (tenant.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Connect account already exists' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const businessType = body.businessType || 'individual'

    // Create Connect account
    const stripe = getStripe()
    const account = await createConnectAccount(
      stripe,
      tenant.email,
      tenant.businessName,
      businessType
    )

    // Save to tenant
    await tenants.updateTenant(user.id, {
      stripeConnectAccountId: account.id,
      stripeConnectStatus: 'pending',
      stripeConnectOnboardingComplete: false,
      stripeConnectChargesEnabled: false,
      stripeConnectPayoutsEnabled: false,
    })

    return NextResponse.json({
      accountId: account.id,
      status: 'pending',
    })
  } catch (error) {
    console.error('Failed to create Connect account:', error)
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    )
  }
}
