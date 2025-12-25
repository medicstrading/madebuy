import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { publish, media } from '@madebuy/db'
import { lateClient } from '@madebuy/social'
import type { SocialPlatform } from '@madebuy/shared'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the publish record
    const publishRecord = await publish.getPublishRecord(tenant.id, params.id)

    if (!publishRecord) {
      return NextResponse.json({ error: 'Publish record not found' }, { status: 404 })
    }

    // Check if already published
    if (publishRecord.status === 'published') {
      return NextResponse.json({ error: 'Post already published' }, { status: 400 })
    }

    // Get media files if any
    const mediaFiles = await Promise.all(
      publishRecord.mediaIds.map(id => media.getMedia(tenant.id, id))
    )

    const validMediaFiles = mediaFiles.filter(m => m !== null)

    // Update status to publishing
    await publish.updatePublishRecord(tenant.id, params.id, { status: 'publishing' })

    try {
      // Get tenant access tokens for each platform
      const tenantAccessTokens: Partial<Record<SocialPlatform, string>> = {}
      if (tenant.socialConnections) {
        for (const conn of tenant.socialConnections) {
          tenantAccessTokens[conn.platform] = conn.accessToken
        }
      }

      // Publish to social platforms using Late API
      const lateResponse = await lateClient.publish({
        platforms: publishRecord.platforms,
        caption: publishRecord.caption,
        mediaUrls: validMediaFiles.map(m => m!.variants.original.url),
        scheduledFor: publishRecord.scheduledFor || undefined,
        tenantAccessTokens: tenantAccessTokens as Record<SocialPlatform, string>,
      })

      // Update with results
      await publish.updatePublishRecord(tenant.id, params.id, {
        status: 'published',
        publishedAt: new Date(),
        results: lateResponse.results,
      })

      return NextResponse.json({
        success: true,
        results: lateResponse.results,
      })
    } catch (publishError) {
      // Update status to failed with error in results
      const errorMessage = publishError instanceof Error ? publishError.message : 'Unknown error'

      const failedResults = publishRecord.platforms.map(platform => ({
        platform,
        status: 'failed' as const,
        error: errorMessage,
      }))

      await publish.updatePublishRecord(tenant.id, params.id, {
        status: 'failed',
        results: failedResults,
      })

      throw publishError
    }
  } catch (error) {
    console.error('Error executing publish:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
