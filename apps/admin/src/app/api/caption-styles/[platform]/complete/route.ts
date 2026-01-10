import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { captionStyles } from '@madebuy/db'
import type { SocialPlatform } from '@madebuy/shared'

const VALID_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'pinterest',
  'youtube',
  'website-blog',
]

function isValidPlatform(platform: string): platform is SocialPlatform {
  return VALID_PLATFORMS.includes(platform as SocialPlatform)
}

/**
 * POST /api/caption-styles/[platform]/complete
 * Mark onboarding as complete for a platform
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform } = await params
    if (!isValidPlatform(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Check profile exists
    const profile = await captionStyles.getCaptionStyleProfile(tenant.id, platform)
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found. Complete onboarding first.' },
        { status: 404 }
      )
    }

    await captionStyles.completeOnboarding(tenant.id, platform)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
