import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { Etsy } from '@madebuy/marketplaces'
import { cookies } from 'next/headers'
import { tenants } from '@madebuy/db'

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID
const ETSY_REDIRECT_URI = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/marketplaces/etsy/callback`
  : 'http://localhost:3301/api/marketplaces/etsy/callback'

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const searchParams = request.nextUrl.searchParams

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Etsy OAuth error:', error)
      return NextResponse.redirect(
        new URL(
          '/dashboard/connections/marketplaces?error=access_denied',
          request.url
        )
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/connections/marketplaces?error=invalid_request',
          request.url
        )
      )
    }

    if (!ETSY_CLIENT_ID) {
      throw new Error('Etsy integration not configured')
    }

    // Verify state
    const cookieStore = await cookies()
    const storedState = cookieStore.get('etsy_state')?.value
    const codeVerifier = cookieStore.get('etsy_code_verifier')?.value

    if (state !== storedState || !codeVerifier) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/connections/marketplaces?error=state_mismatch',
          request.url
        )
      )
    }

    // Exchange code for token
    const tokenResponse = await Etsy.exchangeCodeForToken({
      clientId: ETSY_CLIENT_ID,
      code,
      codeVerifier,
      redirectUri: ETSY_REDIRECT_URI,
    })

    // Get shop information
    const apiKey = ETSY_CLIENT_ID
    const client = new Etsy.EtsyClient(apiKey, tokenResponse.access_token)

    // Extract shop ID from access token (Etsy includes it as prefix)
    const shopId = tokenResponse.access_token.split('.')[0]
    const shop = await client.getShop(shopId)

    // Get shipping profiles
    const shippingProfiles = await client.getShippingProfiles(shopId)
    const defaultShippingProfile = shippingProfiles.results[0]

    // Calculate token expiration
    const expiresAt = Etsy.calculateTokenExpiration(tokenResponse.expires_in)

    // Update tenant with Etsy integration
    await tenants.updateTenant(tenant.id, {
      integrations: {
        ...tenant.integrations,
        etsy: {
          shopId: shopId,
          shopName: shop.shop_name,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt,
          tokenType: tokenResponse.token_type,
          shippingProfileId: defaultShippingProfile?.shipping_profile_id?.toString(),
          autoSync: true,
          syncDirection: 'one_way',
          connectedAt: new Date(),
        },
      },
    })

    // Clear cookies
    cookieStore.delete('etsy_code_verifier')
    cookieStore.delete('etsy_state')

    // Redirect to Etsy settings page
    return NextResponse.redirect(
      new URL('/dashboard/connections/marketplaces/etsy', request.url)
    )
  } catch (error) {
    console.error('Etsy callback error:', error)
    return NextResponse.redirect(
      new URL(
        '/dashboard/connections/marketplaces?error=callback_failed',
        request.url
      )
    )
  }
}
