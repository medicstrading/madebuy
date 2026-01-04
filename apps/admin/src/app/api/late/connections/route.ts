import { NextResponse } from 'next/server'
import { lateClient } from '@madebuy/social'
import { getCurrentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

// All platforms Late.dev supports
const ALL_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'pinterest',
  'youtube',
  'linkedin',
  'twitter',
  'threads',
  'reddit',
  'mastodon'
] as const

export async function GET() {
  try {
    // Require authentication
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await lateClient.getAccounts()

    // Extract connected platforms (active accounts only)
    const connectedPlatforms = data.accounts
      .filter(acc => acc.isActive)
      .map(acc => ({
        platform: acc.platform,
        username: acc.username,
        profileImage: acc.profileImage,
        accountId: acc.id
      }))

    // List of connected platform names
    const connected = connectedPlatforms.map(p => p.platform)

    // Available = all platforms minus connected
    const available = ALL_PLATFORMS.filter(p => !connected.includes(p))

    return NextResponse.json({
      success: true,
      connected,
      available,
      connectedPlatforms,
      count: connectedPlatforms.length
    })
  } catch (error) {
    console.error('Error fetching Late.dev connections:', error)
    return NextResponse.json({
      success: false,
      connected: [],
      available: [...ALL_PLATFORMS],
      connectedPlatforms: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch connections'
    }, { status: 500 })
  }
}
