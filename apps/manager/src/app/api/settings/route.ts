import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

// In-memory settings store (in production, this would be stored in database)
const platformSettings = {
  general: {
    platformName: 'MadeBuy',
    supportEmail: 'support@madebuy.com.au',
    maintenanceMode: false,
    allowNewSignups: true,
  },
  pricing: {
    tiers: [
      {
        name: 'Free',
        price: 0,
        interval: 'month' as const,
        features: ['Up to 10 products', 'Basic storefront'],
        limits: { products: 10, orders: 50, storage: 100 },
      },
      {
        name: 'Maker',
        price: 15,
        interval: 'month' as const,
        features: ['Unlimited products', 'Social publishing', 'Custom domain'],
        limits: { products: -1, orders: -1, storage: 1000 },
      },
      {
        name: 'Professional',
        price: 29,
        interval: 'month' as const,
        features: ['Everything in Maker', 'AI captions', 'Advanced analytics'],
        limits: { products: -1, orders: -1, storage: 5000 },
      },
      {
        name: 'Studio',
        price: 59,
        interval: 'month' as const,
        features: ['Everything in Pro', 'API access', 'Priority support'],
        limits: { products: -1, orders: -1, storage: 20000 },
      },
    ],
  },
  features: {
    socialPublishing: true,
    aiCaptions: true,
    customDomains: true,
    apiAccess: true,
    advancedAnalytics: true,
  },
  notifications: {
    emailOnNewSignup: true,
    emailOnChurn: true,
    slackWebhook: '',
    alertThresholds: {
      errorRate: 5,
      churnRate: 10,
    },
  },
}

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json(platformSettings)
  } catch (error) {
    console.error('Settings GET error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()

    // Validate and update settings
    if (body.general) {
      platformSettings.general = {
        ...platformSettings.general,
        ...body.general,
      }
    }

    if (body.features) {
      platformSettings.features = {
        ...platformSettings.features,
        ...body.features,
      }
    }

    if (body.notifications) {
      platformSettings.notifications = {
        ...platformSettings.notifications,
        ...body.notifications,
      }
    }

    // Note: Pricing tiers are typically managed through Stripe dashboard
    // and environment variables, so we don't update them here

    return NextResponse.json({
      success: true,
      settings: platformSettings,
    })
  } catch (error) {
    console.error('Settings PUT error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
