import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { nanoid } from 'nanoid'
import crypto from 'crypto'

/**
 * eBay OAuth Configuration
 *
 * eBay uses standard OAuth 2.0 Authorization Code flow.
 * Docs: https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html
 */

const EBAY_AUTH_URL = process.env.EBAY_ENVIRONMENT === 'production'
  ? 'https://auth.ebay.com/oauth2/authorize'
  : 'https://auth.sandbox.ebay.com/oauth2/authorize'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_REDIRECT_URI = process.env.EBAY_REDIRECT_URI

// eBay scopes needed for selling
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
].join(' ')

/**
 * GET /api/marketplace/ebay/connect
 *
 * Initiates eBay OAuth flow by redirecting to eBay's authorization page.
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if eBay credentials are configured
    if (!EBAY_CLIENT_ID || !EBAY_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'eBay integration not configured' },
        { status: 500 }
      )
    }

    // Check if already connected
    const existingConnection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay'
    )
    if (existingConnection && existingConnection.status === 'connected') {
      return NextResponse.json(
        { error: 'Already connected to eBay' },
        { status: 400 }
      )
    }

    // Generate state parameter for CSRF protection
    const nonce = nanoid(32)
    const state = crypto
      .createHash('sha256')
      .update(nonce + tenant.id)
      .digest('hex')
      .slice(0, 32)

    // Get return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/dashboard/settings/marketplace'

    // Store OAuth state for verification
    await marketplace.saveOAuthState({
      tenantId: tenant.id,
      marketplace: 'ebay',
      nonce: state,
      returnUrl,
      createdAt: new Date(),
    })

    // Build eBay authorization URL
    const authUrl = new URL(EBAY_AUTH_URL)
    authUrl.searchParams.set('client_id', EBAY_CLIENT_ID)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', EBAY_REDIRECT_URI)
    authUrl.searchParams.set('scope', EBAY_SCOPES)
    authUrl.searchParams.set('state', state)

    // Redirect to eBay
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error initiating eBay OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate eBay connection' },
      { status: 500 }
    )
  }
}
