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
 * GET /api/caption-styles/[platform]/examples
 * Get all example posts for a platform
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

    const examples = await captionStyles.getExamplePosts(tenant.id, platform)

    return NextResponse.json({ examples })
  } catch (error) {
    console.error('Error fetching examples:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/caption-styles/[platform]/examples
 * Add a new example post
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

    const { content, source = 'user' } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Check example count limit (max 10)
    const existing = await captionStyles.getExamplePosts(tenant.id, platform)
    if (existing.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 examples allowed per platform' },
        { status: 400 }
      )
    }

    const example = await captionStyles.addExamplePost(
      tenant.id,
      platform,
      content.trim(),
      source
    )

    return NextResponse.json({ example }, { status: 201 })
  } catch (error) {
    console.error('Error adding example:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/caption-styles/[platform]/examples
 * Remove an example post (pass exampleId in body)
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

    const { exampleId } = await request.json()

    if (!exampleId) {
      return NextResponse.json({ error: 'Example ID required' }, { status: 400 })
    }

    await captionStyles.removeExamplePost(tenant.id, platform, exampleId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing example:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
