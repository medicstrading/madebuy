import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { getEbayApiUrl } from '@/lib/marketplace/ebay'

/**
 * GET /api/marketplace/ebay/policies
 *
 * Fetch all business policies from eBay API
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get eBay connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
    }

    // Fetch all policies in parallel
    const [fulfillmentRes, paymentRes, returnRes, locationRes] = await Promise.all([
      fetch(getEbayApiUrl('/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_AU'), { headers }),
      fetch(getEbayApiUrl('/sell/account/v1/payment_policy?marketplace_id=EBAY_AU'), { headers }),
      fetch(getEbayApiUrl('/sell/account/v1/return_policy?marketplace_id=EBAY_AU'), { headers }),
      fetch(getEbayApiUrl('/sell/account/v1/location'), { headers }),
    ])

    // Parse responses
    const fulfillmentData = fulfillmentRes.ok ? await fulfillmentRes.json() : { fulfillmentPolicies: [] }
    const paymentData = paymentRes.ok ? await paymentRes.json() : { paymentPolicies: [] }
    const returnData = returnRes.ok ? await returnRes.json() : { returnPolicies: [] }
    const locationData = locationRes.ok ? await locationRes.json() : { locations: [] }

    // Format response
    const policies = {
      fulfillment: (fulfillmentData.fulfillmentPolicies || []).map((p: any) => ({
        id: p.fulfillmentPolicyId,
        name: p.name,
        description: p.description,
        marketplaceId: p.marketplaceId,
      })),
      payment: (paymentData.paymentPolicies || []).map((p: any) => ({
        id: p.paymentPolicyId,
        name: p.name,
        description: p.description,
        marketplaceId: p.marketplaceId,
      })),
      return: (returnData.returnPolicies || []).map((p: any) => ({
        id: p.returnPolicyId,
        name: p.name,
        description: p.description,
        marketplaceId: p.marketplaceId,
      })),
      locations: (locationData.locations || []).map((l: any) => ({
        key: l.merchantLocationKey,
        name: l.name,
        address: l.location?.address,
        status: l.merchantLocationStatus,
      })),
    }

    // Check for errors
    const errors: string[] = []
    if (!fulfillmentRes.ok) errors.push(`Fulfillment: ${fulfillmentRes.status}`)
    if (!paymentRes.ok) errors.push(`Payment: ${paymentRes.status}`)
    if (!returnRes.ok) errors.push(`Return: ${returnRes.status}`)
    if (!locationRes.ok) errors.push(`Location: ${locationRes.status}`)

    return NextResponse.json({
      policies,
      errors: errors.length > 0 ? errors : undefined,
      envVars: {
        EBAY_FULFILLMENT_POLICY_ID: policies.fulfillment[0]?.id || 'NOT_FOUND',
        EBAY_PAYMENT_POLICY_ID: policies.payment[0]?.id || 'NOT_FOUND',
        EBAY_RETURN_POLICY_ID: policies.return[0]?.id || 'NOT_FOUND',
        EBAY_MERCHANT_LOCATION_KEY: policies.locations[0]?.key || 'NOT_FOUND',
      },
    })
  } catch (error) {
    console.error('Error fetching eBay policies:', error)
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
  }
}
