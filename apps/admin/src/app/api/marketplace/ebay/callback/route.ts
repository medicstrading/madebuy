import { marketplace } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

/**
 * eBay OAuth Token Endpoint Configuration
 * Helper functions to get config at runtime (not module load time)
 */
function getEbayTokenUrl() {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
}

function getEbayUserInfoUrl() {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'https://apiz.ebay.com/commerce/identity/v1/user/'
    : 'https://apiz.sandbox.ebay.com/commerce/identity/v1/user/'
}

function getAppUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3300'
}

/**
 * GET /api/marketplace/ebay/callback
 *
 * OAuth callback handler. Exchanges authorization code for access token.
 * eBay redirects here after user authorizes the app.
 */
export async function GET(request: NextRequest) {
  // Get config at runtime
  const APP_URL = getAppUrl()
  const EBAY_TOKEN_URL = getEbayTokenUrl()
  const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
  const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
  const EBAY_REDIRECT_URI = process.env.EBAY_REDIRECT_URI

  // Debug logging
  console.log('[eBay Callback] Environment:', process.env.EBAY_ENVIRONMENT)
  console.log('[eBay Callback] Token URL:', EBAY_TOKEN_URL)

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors from eBay
    if (error) {
      console.error('eBay OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent(errorDescription || error)}`,
      )
    }

    // Validate required params
    if (!code || !state) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Missing authorization code or state')}`,
      )
    }

    // Get authenticated tenant for cross-tenant isolation
    const tenant = await requireTenant()

    // Verify state and get tenant info (with tenantId filter)
    const oauthState = await marketplace.verifyOAuthState(tenant.id, state)
    if (!oauthState) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Invalid or expired OAuth state. Please try again.')}`,
      )
    }

    // Validate that the OAuth state is for eBay
    if (oauthState.marketplace !== 'ebay') {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('OAuth state mismatch')}`,
      )
    }

    // Check credentials
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_REDIRECT_URI) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('eBay integration not configured')}`,
      )
    }

    // Exchange authorization code for access token
    const credentials = Buffer.from(
      `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    ).toString('base64')

    const tokenResponse = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: EBAY_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('eBay token exchange failed:', errorData)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Failed to connect to eBay. Please try again.')}`,
      )
    }

    const tokenData = await tokenResponse.json()

    // Calculate token expiry
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    // Get user info from eBay to get seller ID
    let sellerId: string | undefined
    let shopName: string | undefined

    try {
      const userInfoUrl = getEbayUserInfoUrl()

      const userResponse = await fetch(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        sellerId = userData.userId
        shopName = userData.username
      }
    } catch (userError) {
      // Non-fatal - continue without user info
      console.warn('Could not fetch eBay user info:', userError)
    }

    // Check for existing connection
    const existingConnection = await marketplace.getConnectionByMarketplace(
      oauthState.tenantId,
      'ebay',
    )

    if (existingConnection) {
      // Update existing connection
      await marketplace.updateConnectionTokens(
        oauthState.tenantId,
        existingConnection.id,
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt,
      )
    } else {
      // Create new connection
      await marketplace.createConnection(oauthState.tenantId, {
        marketplace: 'ebay',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        sellerId,
        shopName,
        scopes: tokenData.scope?.split(' '),
      })
    }

    // Redirect back to marketplace with success
    const returnUrl = oauthState.returnUrl || '/dashboard/marketplace'
    return NextResponse.redirect(`${APP_URL}${returnUrl}?success=ebay`)
  } catch (error) {
    console.error('eBay OAuth callback error:', error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('An unexpected error occurred')}`,
    )
  }
}
