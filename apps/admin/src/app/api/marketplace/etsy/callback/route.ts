import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * Etsy OAuth Token Endpoint
 * Docs: https://developer.etsy.com/documentation/essentials/authentication/
 */
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'
const ETSY_API_URL = 'https://api.etsy.com/v3'

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3300'

/**
 * GET /api/marketplace/etsy/callback
 *
 * OAuth callback handler for Etsy. Exchanges authorization code for access token using PKCE.
 * Etsy redirects here after user authorizes the app.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors from Etsy
    if (error) {
      console.error('Etsy OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    // Validate required params
    if (!code || !state) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Missing authorization code or state')}`
      )
    }

    // State parameter is just the nonce - code verifier is in the database
    const nonce = state

    // Verify state and retrieve code verifier from database
    // SECURITY: Code verifier comes from database, not from URL
    const oauthState = await marketplace.verifyOAuthState(nonce)
    if (!oauthState) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Invalid or expired OAuth state. Please try again.')}`
      )
    }

    // Verify this is an Etsy OAuth state
    if (oauthState.marketplace !== 'etsy') {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('OAuth state mismatch')}`
      )
    }

    // Get code verifier from database (SECURITY: not from URL)
    const codeVerifier = oauthState.codeVerifier
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Missing code verifier. Please try again.')}`
      )
    }

    // Check credentials
    if (!ETSY_CLIENT_ID || !ETSY_REDIRECT_URI) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Etsy integration not configured')}`
      )
    }

    // Exchange authorization code for access token using PKCE
    // Etsy requires x-www-form-urlencoded body
    const tokenResponse = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ETSY_CLIENT_ID,
        redirect_uri: ETSY_REDIRECT_URI,
        code,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Etsy token exchange failed:', tokenResponse.status, errorData)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('Failed to connect to Etsy. Please try again.')}`
      )
    }

    const tokenData = await tokenResponse.json()

    // Calculate token expiry
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    // Get shop info from Etsy API
    // The /v3/application/users/me endpoint returns the authenticated user's info
    let shopId: string | undefined
    let shopName: string | undefined
    let userId: string | undefined

    try {
      // First, get user ID
      const userResponse = await fetch(`${ETSY_API_URL}/application/users/me`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'x-api-key': ETSY_CLIENT_ID,
        },
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        userId = userData.user_id?.toString()

        // Then get the user's shop
        if (userId) {
          const shopResponse = await fetch(`${ETSY_API_URL}/application/users/${userId}/shops`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'x-api-key': ETSY_CLIENT_ID,
            },
          })

          if (shopResponse.ok) {
            const shopData = await shopResponse.json()
            // Etsy returns an array of shops (usually just one for most sellers)
            if (shopData.results && shopData.results.length > 0) {
              const shop = shopData.results[0]
              shopId = shop.shop_id?.toString()
              shopName = shop.shop_name
            }
          } else {
            console.warn('Could not fetch Etsy shop:', await shopResponse.text())
          }
        }
      } else {
        console.warn('Could not fetch Etsy user:', await userResponse.text())
      }
    } catch (userError) {
      // Non-fatal - continue without shop info
      console.warn('Could not fetch Etsy user/shop info:', userError)
    }

    // Check for existing connection
    const existingConnection = await marketplace.getConnectionByMarketplace(
      oauthState.tenantId,
      'etsy'
    )

    if (existingConnection) {
      // Update existing connection
      await marketplace.updateConnectionTokens(
        oauthState.tenantId,
        existingConnection.id,
        tokenData.access_token,
        tokenData.refresh_token,
        expiresAt
      )
    } else {
      // Create new connection
      await marketplace.createConnection(oauthState.tenantId, {
        marketplace: 'etsy',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        sellerId: shopId || userId,
        shopName,
        scopes: tokenData.scope?.split(' '),
      })
    }

    // Redirect back to settings with success
    const returnUrl = oauthState.returnUrl || '/dashboard/marketplace'
    return NextResponse.redirect(
      `${APP_URL}${returnUrl}?success=etsy`
    )
  } catch (error) {
    console.error('Etsy OAuth callback error:', error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/marketplace?error=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}
