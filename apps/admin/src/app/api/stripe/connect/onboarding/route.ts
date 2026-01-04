import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'
import type { StripeOnboardingResponse } from '@madebuy/shared'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

/**
 * POST /api/stripe/connect/onboarding
 * Generate Stripe Connect onboarding link
 */
export async function POST() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connectAccountId = tenant.paymentConfig?.stripe?.connectAccountId
    if (!connectAccountId) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Create one first.' },
        { status: 400 }
      )
    }

    // Generate onboarding link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3300'
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${baseUrl}/dashboard/settings/payments?refresh=true`,
      return_url: `${baseUrl}/dashboard/settings/payments?onboarding=complete`,
      type: 'account_onboarding',
    })

    const response: StripeOnboardingResponse = {
      url: accountLink.url,
      expiresAt: new Date(accountLink.expires_at * 1000),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to create onboarding link:', error)
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    )
  }
}
