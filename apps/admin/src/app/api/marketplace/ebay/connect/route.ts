import crypto from 'node:crypto'
import { marketplace } from '@madebuy/db'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * eBay OAuth Configuration
 *
 * eBay uses standard OAuth 2.0 Authorization Code flow.
 * Docs: https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html
 */

// Helper functions to get config at runtime (not module load time)
// This ensures env vars are read fresh on each request
function getEbayAuthUrl() {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'https://auth.ebay.com/oauth2/authorize'
    : 'https://auth.sandbox.ebay.com/oauth2/authorize'
}

function getEbayClientId() {
  return process.env.EBAY_CLIENT_ID
}

function getEbayRedirectUri() {
  return process.env.EBAY_REDIRECT_URI
}

/**
 * Validate returnUrl against an allowlist of safe relative paths.
 * Prevents open redirect attacks via the OAuth returnUrl parameter.
 */
const ALLOWED_RETURN_URL_PREFIXES = [
  '/dashboard/marketplace',
  '/dashboard/settings',
  '/dashboard/connections',
]

function validateReturnUrl(url: string | null): string {
  const defaultUrl = '/dashboard/marketplace'
  if (!url) return defaultUrl
  // Must be a relative path starting with /
  if (!url.startsWith('/')) return defaultUrl
  // Block protocol-relative URLs and javascript/data schemes
  if (url.startsWith('//')) return defaultUrl
  if (url.includes('://')) return defaultUrl
  if (url.toLowerCase().includes('javascript:')) return defaultUrl
  if (url.toLowerCase().includes('data:')) return defaultUrl
  // Must match an allowed prefix
  if (!ALLOWED_RETURN_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return defaultUrl
  }
  return url
}

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

    // Check feature gate for marketplace sync
    if (!tenant.features.marketplaceSync) {
      return NextResponse.json(
        { error: 'Marketplace integration requires a Pro or higher plan' },
        { status: 403 },
      )
    }

    // Get config at runtime
    const ebayClientId = getEbayClientId()
    const ebayRedirectUri = getEbayRedirectUri()
    const ebayAuthUrl = getEbayAuthUrl()

    // Debug logging
    console.log('[eBay OAuth] Environment:', process.env.EBAY_ENVIRONMENT)
    console.log('[eBay OAuth] Auth URL:', ebayAuthUrl)
    console.log(
      '[eBay OAuth] Client ID:',
      `${ebayClientId?.substring(0, 20)}...`,
    )
    console.log('[eBay OAuth] Redirect URI:', ebayRedirectUri)

    // Check if eBay credentials are configured
    if (!ebayClientId || !ebayRedirectUri) {
      return NextResponse.json(
        { error: 'eBay integration not configured' },
        { status: 500 },
      )
    }

    // Check if already connected
    const existingConnection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (existingConnection && existingConnection.status === 'connected') {
      return NextResponse.json(
        { error: 'Already connected to eBay' },
        { status: 400 },
      )
    }

    // Generate state parameter for CSRF protection
    const nonce = nanoid(32)
    const state = crypto
      .createHash('sha256')
      .update(nonce + tenant.id)
      .digest('hex')
      .slice(0, 32)

    // Get return URL from query params and validate against allowlist
    const returnUrl = validateReturnUrl(request.nextUrl.searchParams.get('returnUrl'))

    // Store OAuth state for verification
    await marketplace.saveOAuthState({
      tenantId: tenant.id,
      marketplace: 'ebay',
      nonce: state,
      returnUrl,
      createdAt: new Date(),
    })

    // Build eBay authorization URL
    const authUrl = new URL(ebayAuthUrl)
    authUrl.searchParams.set('client_id', ebayClientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', ebayRedirectUri)
    authUrl.searchParams.set('scope', EBAY_SCOPES)
    authUrl.searchParams.set('state', state)

    // Redirect to eBay
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error initiating eBay OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate eBay connection' },
      { status: 500 },
    )
  }
}
