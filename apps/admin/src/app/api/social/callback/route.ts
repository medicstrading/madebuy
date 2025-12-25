import { NextRequest, NextResponse } from 'next/server'
import { tenants } from '@madebuy/db'
import { lateClient } from '@madebuy/social'
import type { SocialPlatform, SocialConnection } from '@madebuy/shared'

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
        new URL('/dashboard/connections/social?error=oauth_failed', request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/connections/social?error=missing_params', request.url)
      )
    }

    // Parse state: format is "tenantId:platform"
    const [tenantId, platform] = state.split(':')

    if (!tenantId || !platform) {
      return NextResponse.redirect(
        new URL('/dashboard/connections/social?error=invalid_state', request.url)
      )
    }

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
        new URL('/dashboard/connections/social?error=tenant_not_found', request.url)
      )
    }

    // Build new connection
    const newConnection: SocialConnection = {
      platform: platform as SocialPlatform,
      method: 'late',
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
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
      c => c.platform !== platform
    )
    updatedConnections.push(newConnection)

    await tenants.updateTenant(tenantId, {
      socialConnections: updatedConnections,
    })

    // Redirect back to settings page with success
    return NextResponse.redirect(
      new URL(`/dashboard/connections/social?success=${platform}`, request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/connections/social?error=callback_failed', request.url)
    )
  }
}
