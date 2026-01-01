import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'
import { createStripeClient, createLoginLink } from '@madebuy/shared/src/stripe'

function getStripe() {
  return createStripeClient(process.env.STRIPE_SECRET_KEY!)
}

// POST - Get Express dashboard login link
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (!tenant.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'No Connect account' },
        { status: 400 }
      )
    }

    if (!tenant.stripeConnectOnboardingComplete) {
      return NextResponse.json(
        { error: 'Complete onboarding first' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const loginLink = await createLoginLink(stripe, tenant.stripeConnectAccountId)

    return NextResponse.json({
      url: loginLink.url,
    })
  } catch (error) {
    console.error('Failed to create dashboard link:', error)
    return NextResponse.json(
      { error: 'Failed to create dashboard link' },
      { status: 500 }
    )
  }
}
