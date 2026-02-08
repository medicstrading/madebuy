import crypto from 'node:crypto'
import { marketplace } from '@madebuy/db'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * Etsy OAuth Configuration
 *
 * Etsy uses OAuth 2.0 with PKCE (Proof Key for Code Exchange).
 * Docs: https://developer.etsy.com/documentation/essentials/authentication/
 */

const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect'
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI

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

// Etsy scopes needed for selling
const ETSY_SCOPES = [
  'listings_r',
  'listings_w',
  'listings_d',
  'shops_r',
  'shops_w',
  'transactions_r',
  'transactions_w',
].join(' ')

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url')

  // Generate code challenge using SHA256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return { codeVerifier, codeChallenge }
}

/**
 * GET /api/marketplace/etsy/connect
 *
 * Initiates Etsy OAuth flow with PKCE.
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

    // Check if Etsy credentials are configured
    if (!ETSY_CLIENT_ID || !ETSY_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'Etsy integration not configured. Coming soon!' },
        { status: 503 },
      )
    }

    // Check if already connected
    const existingConnection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'etsy',
    )
    if (existingConnection && existingConnection.status === 'connected') {
      return NextResponse.json(
        { error: 'Already connected to Etsy' },
        { status: 400 },
      )
    }

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE()

    // Generate state parameter for CSRF protection
    const nonce = nanoid(32)

    // Get return URL from query params and validate against allowlist
    const returnUrl = validateReturnUrl(request.nextUrl.searchParams.get('returnUrl'))

    // Store OAuth state with code verifier securely in database
    // SECURITY: Code verifier is stored in DB, NOT in URL state parameter
    await marketplace.saveOAuthState({
      tenantId: tenant.id,
      marketplace: 'etsy',
      nonce,
      returnUrl,
      createdAt: new Date(),
      codeVerifier, // Stored securely in database
    })

    // Only the nonce goes in the URL state parameter
    // The code verifier stays safely in the database
    const state = nonce

    // Build Etsy authorization URL
    const authUrl = new URL(ETSY_AUTH_URL)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', ETSY_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', ETSY_REDIRECT_URI)
    authUrl.searchParams.set('scope', ETSY_SCOPES)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    // Redirect to Etsy
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error initiating Etsy OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Etsy connection' },
      { status: 500 },
    )
  }
}
