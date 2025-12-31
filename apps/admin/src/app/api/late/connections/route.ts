import { NextResponse } from 'next/server'
import { lateClient } from '@madebuy/social'

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
    const data = await lateClient.getAccounts()

    console.log('Late.dev raw accounts:', JSON.stringify(data.accounts.map(a => ({
      platform: a.platform,
      isActive: a.isActive,
      id: a.id
    })), null, 2))

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

    console.log('Late.dev connected platforms:', connected.join(', ') || 'none')

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
