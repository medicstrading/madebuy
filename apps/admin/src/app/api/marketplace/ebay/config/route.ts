import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/marketplace/ebay/config
 *
 * Check eBay configuration status (what's configured vs missing)
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    const isConnected = connection?.status === 'connected'

    // Check required configuration
    const config = {
      connected: isConnected,
      sellerId: connection?.sellerId || null,
      shopName: connection?.shopName || null,
      policies: {
        fulfillment: {
          configured: !!process.env.EBAY_FULFILLMENT_POLICY_ID,
          envVar: 'EBAY_FULFILLMENT_POLICY_ID',
        },
        payment: {
          configured: !!process.env.EBAY_PAYMENT_POLICY_ID,
          envVar: 'EBAY_PAYMENT_POLICY_ID',
        },
        return: {
          configured: !!process.env.EBAY_RETURN_POLICY_ID,
          envVar: 'EBAY_RETURN_POLICY_ID',
        },
      },
      merchantLocation: {
        configured: !!process.env.EBAY_MERCHANT_LOCATION_KEY,
        envVar: 'EBAY_MERCHANT_LOCATION_KEY',
      },
      defaultCategory: {
        configured: !!process.env.EBAY_DEFAULT_CATEGORY_ID,
        value: process.env.EBAY_DEFAULT_CATEGORY_ID || null,
        envVar: 'EBAY_DEFAULT_CATEGORY_ID',
      },
      environment: process.env.EBAY_ENVIRONMENT || 'sandbox',
    }

    // Calculate readiness
    const policiesReady =
      config.policies.fulfillment.configured &&
      config.policies.payment.configured &&
      config.policies.return.configured
    const locationReady = config.merchantLocation.configured
    const readyToList = isConnected && policiesReady && locationReady

    return NextResponse.json({
      ...config,
      policiesReady,
      locationReady,
      readyToList,
    })
  } catch (error) {
    console.error('Error checking eBay config:', error)
    return NextResponse.json({ error: 'Failed to check configuration' }, { status: 500 })
  }
}
