import { captionStyles, media, tenants } from '@madebuy/db'
import type { SocialPlatform } from '@madebuy/shared'
import { canUseAiCaption, getPlanLimits } from '@madebuy/shared'
import { generateCaption } from '@madebuy/social'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check feature gate for AI captions
    if (!tenant.features.aiCaptions) {
      return NextResponse.json(
        { error: 'AI caption generation requires a Pro or higher plan' },
        { status: 403 },
      )
    }

    // Check usage limit
    const usedThisMonth = tenant.usage?.aiCaptionsUsedThisMonth ?? 0
    if (!canUseAiCaption(tenant.plan, usedThisMonth)) {
      const limits = getPlanLimits(tenant.plan)
      return NextResponse.json(
        {
          error: `Monthly AI caption limit reached (${limits.aiCaptionsPerMonth}). Upgrade your plan for more.`,
        },
        { status: 403 },
      )
    }

    const {
      mediaIds,
      style,
      productName,
      productDescription,
      includeHashtags,
      platform,
    } = await request.json()

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'Media IDs required' }, { status: 400 })
    }

    // Get media files
    const mediaFiles = await Promise.all(
      mediaIds.map((id: string) => media.getMedia(tenant.id, id)),
    )

    const validMediaFiles = mediaFiles.filter((m) => m !== null)

    if (validMediaFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid media found' },
        { status: 404 },
      )
    }

    // Fetch style profile if platform is specified
    let styleProfile = null
    if (platform) {
      styleProfile = await captionStyles.getCaptionStyleProfile(
        tenant.id,
        platform as SocialPlatform,
      )
    }

    // Generate caption using AI with style profile
    const result = await generateCaption({
      mediaIds, // Required by interface but not used by implementation
      imageUrls: validMediaFiles.map((m) => m?.variants.original.url),
      productName: productName || tenant.businessName,
      productDescription,
      style: style || 'professional',
      includeHashtags: includeHashtags !== false,
      tenantId: tenant.id,
      platform: platform as SocialPlatform | undefined,
      styleProfile: styleProfile || undefined,
    })

    // Increment usage counter
    await tenants.incrementUsage(tenant.id, 'aiCaptionsUsedThisMonth')

    return NextResponse.json({
      ...result,
      hasStyleProfile: !!styleProfile,
      onboardingComplete: styleProfile?.onboardingComplete ?? false,
    })
  } catch (error) {
    console.error('Error generating caption:', error)

    // Don't leak API configuration details to client
    const errorMessage = error instanceof Error && error.message.includes('not configured')
      ? 'AI service is not configured. Please contact support.'
      : 'Failed to generate caption. Please try again.'

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
