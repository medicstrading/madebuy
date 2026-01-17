import type { SocialPlatform } from '@madebuy/shared'
import { lateClient } from '@madebuy/social'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

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

    // Build redirect URI for Late.dev callback
    const host = request.headers.get('host') || 'localhost:3300'
    const isLocalDev = host.startsWith('localhost')
    const protocol = isLocalDev ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const redirectUri = `${baseUrl}/api/late/callback`

    // Get connect URL from Late.dev
    const authUrl = await lateClient.getConnectUrl(platform, redirectUri)

    return NextResponse.json({ authUrl })
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
