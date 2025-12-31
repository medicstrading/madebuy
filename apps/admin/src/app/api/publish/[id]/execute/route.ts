import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { publish, media, blog } from '@madebuy/db'
import { lateClient, type LateMedia, type LatePlatform, type LatePlatformType } from '@madebuy/social'
import type { SocialPlatform, PlatformResult } from '@madebuy/shared'

// Video file extensions for determining media type
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']

/**
 * Determine if a URL points to a video file
 */
function isVideo(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  return VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext))
}

/**
 * Get account ID for a platform from environment variables or Late API
 */
async function getAccountIdForPlatform(
  platform: Exclude<SocialPlatform, 'website-blog'>,
  socialConnections?: { platform: SocialPlatform; lateAccountId?: string; isActive: boolean }[]
): Promise<string | null> {
  // First, check if tenant has a stored lateAccountId for this platform
  if (socialConnections) {
    const connection = socialConnections.find(
      c => c.platform === platform && c.isActive && c.lateAccountId
    )
    if (connection?.lateAccountId) {
      return connection.lateAccountId
    }
  }

  // Fall back to environment variables
  const envKey = `LATE_${platform.toUpperCase()}_ACCOUNT_ID`
  const envAccountId = process.env[envKey]
  if (envAccountId) {
    return envAccountId
  }

  // Last resort: query Late API for accounts
  try {
    const accounts = await lateClient.getAccountsByPlatform(platform)
    return accounts[0]?.id || null
  } catch (error) {
    console.error(`Failed to get account ID for ${platform}:`, error)
    return null
  }
}

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

    const results: PlatformResult[] = []

    // Separate social platforms from blog
    const socialPlatforms = publishRecord.platforms.filter(p => p !== 'website-blog') as Exclude<SocialPlatform, 'website-blog'>[]
    const includeBlog = publishRecord.platforms.includes('website-blog')

    try {
      // Publish to social media platforms via Late.dev
      if (socialPlatforms.length > 0) {
        try {
          // Build platform targets with account IDs
          const platformTargets: LatePlatform[] = []
          const missingPlatforms: string[] = []

          for (const platform of socialPlatforms) {
            const accountId = await getAccountIdForPlatform(platform, tenant.socialConnections)

            if (accountId) {
              platformTargets.push({ platform: platform as LatePlatformType, accountId })
            } else {
              missingPlatforms.push(platform)
            }
          }

          // Add failed results for platforms without account IDs
          for (const platform of missingPlatforms) {
            results.push({
              platform: platform as SocialPlatform,
              status: 'failed',
              error: `No connected account found for ${platform}. Please connect your ${platform} account in Settings.`,
            })
          }

          // Only proceed if we have at least one platform with an account ID
          if (platformTargets.length > 0) {
            // Build media items from valid media files
            const mediaUrls = validMediaFiles.map(m => m!.variants.original.url)
            const mediaItems: LateMedia[] = mediaUrls.map(url => ({
              type: isVideo(url) ? 'video' as const : 'image' as const,
              url
            }))

            // Create post using the new Late API format
            const lateResponse = await lateClient.createPost({
              content: publishRecord.caption,
              platforms: platformTargets,
              mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
              scheduledFor: publishRecord.scheduledFor?.toISOString(),
            })

            // Convert Late API results to PlatformResult format
            if (lateResponse.platformPosts) {
              for (const lateResult of lateResponse.platformPosts) {
                results.push({
                  platform: lateResult.platform as SocialPlatform,
                  status: lateResult.error ? 'failed' : 'success',
                  postId: lateResult.platformPostId,
                  postUrl: lateResult.platformPostUrl || lateResult.permalink,
                  error: lateResult.error,
                })
              }
            }
          }
        } catch (socialError) {
          // If social publishing fails, mark all remaining social platforms as failed
          const errorMessage = socialError instanceof Error ? socialError.message : 'Social publishing failed'

          // Only add failures for platforms that weren't already added
          const alreadyResultedPlatforms = new Set(results.map(r => r.platform))

          socialPlatforms.forEach(platform => {
            if (!alreadyResultedPlatforms.has(platform)) {
              results.push({
                platform,
                status: 'failed',
                error: errorMessage,
              })
            }
          })
        }
      }

      // Publish to blog
      if (includeBlog && publishRecord.blogConfig) {
        try {
          // Create blog post
          const blogPost = await blog.createBlogPost(tenant.id, {
            title: publishRecord.blogConfig.title,
            excerpt: publishRecord.blogConfig.excerpt,
            content: publishRecord.caption, // Use caption as content
            coverImageId: validMediaFiles[0]?.id, // Use first media as cover
            tags: publishRecord.blogConfig.tags || [],
            metaTitle: publishRecord.blogConfig.metaTitle,
            metaDescription: publishRecord.blogConfig.metaDescription,
            status: 'published',
            publishRecordId: params.id,
          })

          // Update publish record with blog post ID
          await publish.updatePublishRecord(tenant.id, params.id, {
            blogPostId: blogPost.id,
          })

          // Add blog success result
          results.push({
            platform: 'website-blog',
            status: 'success',
            postId: blogPost.id,
            postUrl: `/${tenant.id}/blog/${blogPost.slug}`,
            publishedAt: new Date(),
          })
        } catch (blogError) {
          // If blog publishing fails, add failure result
          const errorMessage = blogError instanceof Error ? blogError.message : 'Blog publishing failed'
          results.push({
            platform: 'website-blog',
            status: 'failed',
            error: errorMessage,
          })
        }
      }

      // Determine final status
      const allSuccess = results.every(r => r.status === 'success')
      const anySuccess = results.some(r => r.status === 'success')
      const finalStatus = allSuccess ? 'published' : (anySuccess ? 'published' : 'failed')

      // Update with results
      await publish.updatePublishRecord(tenant.id, params.id, {
        status: finalStatus,
        publishedAt: allSuccess ? new Date() : undefined,
        results,
      })

      return NextResponse.json({
        success: allSuccess,
        results,
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
