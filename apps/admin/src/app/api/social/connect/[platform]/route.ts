import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { lateClient } from '@madebuy/social'
import type { SocialPlatform } from '@madebuy/shared'

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platform = params.platform as SocialPlatform

    // Validate platform
    const validPlatforms: SocialPlatform[] = ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Get base URL from environment or request
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const redirectUri = `${baseUrl}/api/social/callback`

    // Get OAuth URL from Late API
    const response = await lateClient.getOAuthUrl({
      platform,
      redirectUri,
      state: `${tenant.id}:${platform}`, // Include tenant ID in state for callback
    })

    return NextResponse.json({ authUrl: response.authUrl })
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}
