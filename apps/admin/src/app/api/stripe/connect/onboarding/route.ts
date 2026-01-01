import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'
import { createStripeClient, createAccountLink } from '@madebuy/shared'

const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY!)

// POST - Generate onboarding link
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
        { error: 'No Connect account. Create one first.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3300'
    const refreshUrl = `${baseUrl}/settings/payments?refresh=true`
    const returnUrl = `${baseUrl}/settings/payments?onboarding=complete`

    const accountLink = await createAccountLink(
      stripe,
      tenant.stripeConnectAccountId,
      refreshUrl,
      returnUrl
    )

    return NextResponse.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    })
  } catch (error) {
    console.error('Failed to create onboarding link:', error)
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    )
  }
}
