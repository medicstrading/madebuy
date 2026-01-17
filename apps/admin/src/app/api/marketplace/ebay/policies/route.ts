import { marketplace } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getEbayApiUrl } from '@/lib/marketplace/ebay'
import { getCurrentTenant } from '@/lib/session'

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
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
    }

    // Fetch all policies in parallel
    // Note: Policies are under /sell/account/v1, but locations are under /sell/inventory/v1
    const [fulfillmentRes, paymentRes, returnRes, locationRes] =
      await Promise.all([
        fetch(
          getEbayApiUrl(
            '/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_AU',
          ),
          { headers },
        ),
        fetch(
          getEbayApiUrl(
            '/sell/account/v1/payment_policy?marketplace_id=EBAY_AU',
          ),
          { headers },
        ),
        fetch(
          getEbayApiUrl(
            '/sell/account/v1/return_policy?marketplace_id=EBAY_AU',
          ),
          { headers },
        ),
        fetch(getEbayApiUrl('/sell/inventory/v1/location'), { headers }),
      ])

    // Log response statuses for debugging
    console.log('[eBay Policies] Response statuses:', {
      fulfillment: fulfillmentRes.status,
      payment: paymentRes.status,
      return: returnRes.status,
      location: locationRes.status,
    })

    // Parse responses - log errors if any
    let fulfillmentData = { fulfillmentPolicies: [] }
    let paymentData = { paymentPolicies: [] }
    let returnData = { returnPolicies: [] }
    let locationData = { locations: [] }

    if (fulfillmentRes.ok) {
      fulfillmentData = await fulfillmentRes.json()
    } else {
      const err = await fulfillmentRes.text()
      console.error('[eBay Policies] Fulfillment error:', err)
    }

    if (paymentRes.ok) {
      paymentData = await paymentRes.json()
    } else {
      const err = await paymentRes.text()
      console.error('[eBay Policies] Payment error:', err)
    }

    if (returnRes.ok) {
      returnData = await returnRes.json()
    } else {
      const err = await returnRes.text()
      console.error('[eBay Policies] Return error:', err)
    }

    if (locationRes.ok) {
      locationData = await locationRes.json()
    } else {
      const err = await locationRes.text()
      console.error('[eBay Policies] Location error:', err)
    }

    // Format response
    const policies = {
      fulfillment: (fulfillmentData.fulfillmentPolicies || []).map(
        (p: any) => ({
          id: p.fulfillmentPolicyId,
          name: p.name,
          description: p.description,
          marketplaceId: p.marketplaceId,
        }),
      ),
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
        address: l.address, // address is at root level in Inventory API response
        status: l.merchantLocationStatus,
      })),
    }

    // Check for errors (but don't count empty locations as an error)
    const errors: string[] = []
    if (!fulfillmentRes.ok) errors.push(`Fulfillment: ${fulfillmentRes.status}`)
    if (!paymentRes.ok) errors.push(`Payment: ${paymentRes.status}`)
    if (!returnRes.ok) errors.push(`Return: ${returnRes.status}`)
    // Location 200 with empty array is valid (no locations created yet)
    if (!locationRes.ok && locationRes.status !== 404) {
      errors.push(`Location: ${locationRes.status}`)
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/marketplace/ebay/policies
 *
 * Create a merchant location for eBay listings
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get eBay connection
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    const body = await request.json()
    const {
      locationKey,
      name,
      addressLine1,
      city,
      stateOrProvince,
      postalCode,
    } = body

    if (!locationKey || !name || !addressLine1 || !city || !postalCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Create merchant location - eBay uses PUT (not POST) with flat structure
    const locationPayload = {
      name,
      merchantLocationStatus: 'ENABLED',
      locationTypes: ['WAREHOUSE'],
      address: {
        addressLine1,
        city,
        stateOrProvince: stateOrProvince || undefined,
        postalCode,
        country: 'AU',
      },
    }

    console.log(
      '[eBay Location] Creating location:',
      locationKey,
      locationPayload,
    )

    const res = await fetch(
      getEbayApiUrl(
        `/sell/inventory/v1/location/${encodeURIComponent(locationKey)}`,
      ),
      {
        method: 'PUT', // eBay Inventory API uses PUT for create/update
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationPayload),
      },
    )

    if (res.ok || res.status === 204) {
      return NextResponse.json({
        success: true,
        locationKey,
        message: 'Merchant location created successfully',
      })
    } else {
      const errorText = await res.text()
      console.error('[eBay Location] Create error:', errorText)
      return NextResponse.json(
        {
          error: `Failed to create location: ${res.status}`,
          details: errorText,
        },
        { status: res.status },
      )
    }
  } catch (error) {
    console.error('Error creating eBay location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 },
    )
  }
}
