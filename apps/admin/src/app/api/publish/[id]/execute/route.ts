import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { publish, media, blog } from '@madebuy/db'
import { lateClient } from '@madebuy/social'
import type { SocialPlatform, PlatformResult } from '@madebuy/shared'

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
          // Get tenant access tokens for each platform
          const tenantAccessTokens: Partial<Record<SocialPlatform, string>> = {}
          if (tenant.socialConnections) {
            for (const conn of tenant.socialConnections) {
              const platform = conn.platform
              // Only include platforms that are in socialPlatforms (excludes website-blog)
              if (platform !== 'website-blog' && socialPlatforms.includes(platform)) {
                tenantAccessTokens[platform] = conn.accessToken
              }
            }
          }

          // Publish to social platforms using Late API
          const lateResponse = await lateClient.publish({
            platforms: socialPlatforms,
            caption: publishRecord.caption,
            mediaUrls: validMediaFiles.map(m => m!.variants.original.url),
            scheduledFor: publishRecord.scheduledFor || undefined,
            tenantAccessTokens: tenantAccessTokens as Record<SocialPlatform, string>,
          })

          // Add social media results
          results.push(...lateResponse.results)
        } catch (socialError) {
          // If social publishing fails, mark all social platforms as failed
          const errorMessage = socialError instanceof Error ? socialError.message : 'Social publishing failed'
          socialPlatforms.forEach(platform => {
            results.push({
              platform,
              status: 'failed',
              error: errorMessage,
            })
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
      const finalStatus = allSuccess ? 'published' : (results.some(r => r.status === 'success') ? 'published' : 'failed')

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
