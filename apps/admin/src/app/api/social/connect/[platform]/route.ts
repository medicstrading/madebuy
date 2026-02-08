import crypto from 'node:crypto'
import { getDatabase } from '@madebuy/db'
import type { SocialPlatform } from '@madebuy/shared'
import { lateClient } from '@madebuy/social'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SOCIAL_OAUTH_STATE_COLLECTION = 'social_oauth_states'

/**
 * Store a social OAuth state nonce in the database for CSRF protection.
 * The nonce is a random value that maps to a tenantId + platform.
 * It expires after 10 minutes.
 */
async function saveSocialOAuthState(
  nonce: string,
  tenantId: string,
  platform: string,
): Promise<void> {
  const db = await getDatabase()
  await db.collection(SOCIAL_OAUTH_STATE_COLLECTION).insertOne({
    nonce,
    tenantId,
    platform,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  })
}

/**
 * POST /api/social/connect/[platform]
 * Initiate OAuth flow for a social platform using Late.dev's connect flow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platform = params.platform as SocialPlatform

    // Validate platform
    const validPlatforms: SocialPlatform[] = [
      'instagram',
      'facebook',
      'tiktok',
      'pinterest',
      'youtube',
    ]
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Generate random nonce for CSRF protection
    const nonce = crypto.randomBytes(32).toString('hex')

    // Store nonce in database linked to tenant and platform
    await saveSocialOAuthState(nonce, tenant.id, platform)

    // Build redirect URI for Late.dev callback
    const host = request.headers.get('host') || 'localhost:3300'
    const isLocalDev = host.startsWith('localhost')
    const protocol = isLocalDev ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const redirectUri = `${baseUrl}/api/late/callback`

    // Get connect URL from Late.dev
    const authUrl = await lateClient.getConnectUrl(platform, redirectUri)

    // Return the auth URL and nonce - the frontend should include the nonce
    // as the state parameter when redirecting to the OAuth provider
    return NextResponse.json({ authUrl, state: nonce })
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initiate connection',
      },
      { status: 500 },
    )
  }
}
