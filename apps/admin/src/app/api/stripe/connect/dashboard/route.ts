import type { StripeDashboardResponse } from '@madebuy/shared'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCurrentTenant } from '@/lib/session'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/stripe/connect/dashboard
 * Generate Stripe Express Dashboard login link
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
        { error: 'No Stripe Connect account found' },
        { status: 400 },
      )
    }

    // Check if onboarding is complete
    if (!tenant.paymentConfig?.stripe?.onboardingComplete) {
      return NextResponse.json(
        { error: 'Complete onboarding first before accessing the dashboard' },
        { status: 400 },
      )
    }

    // Generate login link to Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(connectAccountId)

    const response: StripeDashboardResponse = {
      url: loginLink.url,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to create dashboard link:', error)
    return NextResponse.json(
      { error: 'Failed to create dashboard link' },
      { status: 500 },
    )
  }
}
