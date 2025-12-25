import { createHash, randomBytes } from 'crypto'
import type { EtsyOAuthConfig, EtsyTokenResponse } from './types'

const ETSY_API_BASE = 'https://api.etsy.com/v3'
const ETSY_OAUTH_BASE = 'https://www.etsy.com/oauth'

/**
 * Generate code verifier and challenge for PKCE flow
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url')

  return { verifier, challenge }
}

/**
 * Generate random state parameter for OAuth flow
 */
export function generateState(): string {
  return randomBytes(16).toString('base64url')
}

/**
 * Get Etsy OAuth authorization URL
 */
export function getAuthorizationUrl(config: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  scopes?: string[]
}): string {
  const scopes = config.scopes || [
    'listings_r',
    'listings_w',
    'shops_r',
    'shops_w',
  ]

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: scopes.join(' '),
    state: config.state,
    code_challenge: config.codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${ETSY_OAUTH_BASE}/connect?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(config: {
  clientId: string
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<EtsyTokenResponse> {
  const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code: config.code,
      code_verifier: config.codeVerifier,
    }),
  })

  if (!response.ok) {
    const error:any = await response.json()
    throw new Error(`Etsy OAuth error: ${error.error} - ${error.error_description}`)
  }

  return await response.json() as EtsyTokenResponse
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(config: {
  clientId: string
  refreshToken: string
}): Promise<EtsyTokenResponse> {
  const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: config.refreshToken,
    }),
  })

  if (!response.ok) {
    const error: any = await response.json()
    throw new Error(`Etsy token refresh error: ${error.error} - ${error.error_description}`)
  }

  return await response.json() as EtsyTokenResponse
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(expiresAt: Date, bufferMinutes = 5): boolean {
  const now = new Date()
  const buffer = bufferMinutes * 60 * 1000
  return expiresAt.getTime() - buffer <= now.getTime()
}

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiration(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}
