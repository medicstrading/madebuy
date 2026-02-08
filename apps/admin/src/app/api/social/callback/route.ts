import { getDatabase, tenants } from '@madebuy/db'
import type { SocialConnection, SocialPlatform } from '@madebuy/shared'
import { encrypt } from '@madebuy/shared'
import { lateClient } from '@madebuy/social'
import { type NextRequest, NextResponse } from 'next/server'

const SOCIAL_OAUTH_STATE_COLLECTION = 'social_oauth_states'

/**
 * Verify and consume social OAuth state nonce from the database.
 * Returns the stored tenantId and platform if valid, null otherwise.
 * The state record is deleted on lookup (single-use nonce).
 */
async function verifySocialOAuthState(
  nonce: string,
): Promise<{ tenantId: string; platform: string } | null> {
  const db = await getDatabase()
  const state = await db
    .collection(SOCIAL_OAUTH_STATE_COLLECTION)
    .findOneAndDelete({
      nonce,
      expiresAt: { $gt: new Date() },
    })
  if (!state) return null
  return { tenantId: state.tenantId as string, platform: state.platform as string }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/connections?error=oauth_failed', request.url),
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/connections?error=missing_params', request.url),
      )
    }

    // Verify state nonce against the database (CSRF protection)
    const oauthState = await verifySocialOAuthState(state)
    if (!oauthState) {
      return NextResponse.redirect(
        new URL('/dashboard/connections?error=invalid_state', request.url),
      )
    }

    const { tenantId, platform } = oauthState

    // Exchange code for access token via Late API
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const redirectUri = `${baseUrl}/api/social/callback`

    const tokenResponse = await lateClient.getOAuthToken({
      platform: platform as SocialPlatform,
      code,
      redirectUri,
    })

    // Create or update social connection for this tenant
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.redirect(
        new URL('/dashboard/connections?error=tenant_not_found', request.url),
      )
    }

    // Build new connection with encrypted tokens
    const newConnection: SocialConnection = {
      platform: platform as SocialPlatform,
      method: 'late',
      // Encrypt sensitive tokens before storage
      accessToken: tokenResponse.accessToken
        ? encrypt(tokenResponse.accessToken)
        : undefined,
      refreshToken: tokenResponse.refreshToken
        ? encrypt(tokenResponse.refreshToken)
        : undefined,
      accountId: `${platform}_account`,
      accountName: 'Connected Account',
      isActive: true,
      connectedAt: new Date(),
      expiresAt: tokenResponse.expiresIn
        ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
        : undefined,
    }

    // Update tenant's social connections
    const existingConnections = tenant.socialConnections || []
    const updatedConnections = existingConnections.filter(
      (c) => c.platform !== platform,
    )
    updatedConnections.push(newConnection)

    await tenants.updateTenant(tenantId, {
      socialConnections: updatedConnections,
    })

    // Redirect back to settings page with success
    return NextResponse.redirect(
      new URL(`/dashboard/connections?success=${platform}`, request.url),
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=callback_failed', request.url),
    )
  }
}
