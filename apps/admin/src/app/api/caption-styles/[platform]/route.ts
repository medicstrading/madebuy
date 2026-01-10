import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { captionStyles } from '@madebuy/db'
import type { SocialPlatform, UpdateCaptionStyleInput } from '@madebuy/shared'

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
 * GET /api/caption-styles/[platform]
 * Get caption style profile for a platform
 */
export async function GET(
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

    const profile = await captionStyles.getCaptionStyleProfile(tenant.id, platform)

    if (!profile) {
      return NextResponse.json({ exists: false, profile: null })
    }

    return NextResponse.json({ exists: true, profile })
  } catch (error) {
    console.error('Error fetching caption style:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caption-styles/[platform]
 * Create a new caption style profile (onboarding)
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

    // Check if profile already exists
    const existing = await captionStyles.getCaptionStyleProfile(tenant.id, platform)
    if (existing) {
      return NextResponse.json(
        { error: 'Profile already exists for this platform' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { style, examplePosts } = body

    const profile = await captionStyles.createCaptionStyleProfile(tenant.id, {
      platform,
      style,
      examplePosts,
    })

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Error creating caption style:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/caption-styles/[platform]
 * Update caption style options
 */
export async function PATCH(
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

    const body: UpdateCaptionStyleInput = await request.json()

    await captionStyles.updateCaptionStyleOptions(tenant.id, platform, body)

    const updated = await captionStyles.getCaptionStyleProfile(tenant.id, platform)

    return NextResponse.json({ profile: updated })
  } catch (error) {
    console.error('Error updating caption style:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caption-styles/[platform]
 * Delete a caption style profile
 */
export async function DELETE(
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

    await captionStyles.deleteCaptionStyleProfile(tenant.id, platform)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting caption style:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
