import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getDatabase, captionStyles } from '@madebuy/db'
import type { SocialPlatform, PublishRecord } from '@madebuy/shared'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * GET/POST /api/cron/learn-captions
 *
 * Auto-learning cron endpoint.
 * Learns from successfully published posts to improve AI caption generation.
 *
 * Schedule: Run daily (0 0 * * *)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface LearnResult {
  tenantId: string
  platform: SocialPlatform
  success: boolean
  error?: string
}

/**
 * Get recently published posts with successful platform results
 */
async function getRecentlyPublishedPosts(daysAgo: number = 7): Promise<PublishRecord[]> {
  const db = await getDatabase()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

  const results = await db.collection('publish_records')
    .find({
      status: 'published',
      publishedAt: { $gte: cutoffDate },
      // Has at least one successful result
      'results.status': 'success',
    })
    .sort({ publishedAt: -1 })
    .toArray()

  return results as unknown as PublishRecord[]
}

/**
 * Check if a caption has already been learned
 */
async function isAlreadyLearned(
  tenantId: string,
  platform: SocialPlatform,
  publishRecordId: string
): Promise<boolean> {
  const profile = await captionStyles.getCaptionStyleProfile(tenantId, platform)
  if (!profile) return false

  return profile.learnedExamples.some(
    (ex) => ex.publishRecordId === publishRecordId
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting caption learning job...')

    // Get recently published posts
    const recentPosts = await getRecentlyPublishedPosts(7)
    console.log(`[CRON] Found ${recentPosts.length} recently published posts`)

    if (recentPosts.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        learned: 0,
        skipped: 0,
        message: 'No recent posts to learn from',
      })
    }

    const results: LearnResult[] = []
    let learned = 0
    let skipped = 0

    for (const post of recentPosts) {
      // Process each successful platform result
      for (const result of post.results) {
        if (result.status !== 'success') continue

        const platform = result.platform

        try {
          // Skip if already learned
          if (await isAlreadyLearned(post.tenantId, platform, post.id)) {
            skipped++
            continue
          }

          // Get the caption for this platform
          const caption = post.platformCaptions?.[platform] || post.caption
          if (!caption || caption.trim().length === 0) {
            skipped++
            continue
          }

          // Check if profile exists for this platform
          let profile = await captionStyles.getCaptionStyleProfile(
            post.tenantId,
            platform
          )

          // If no profile, create one with defaults
          if (!profile) {
            profile = await captionStyles.createCaptionStyleProfile(
              post.tenantId,
              { platform }
            )
          }

          // Add learned example
          await captionStyles.addLearnedExample(
            post.tenantId,
            platform,
            caption,
            post.id
          )

          // Prune to keep only latest 10
          await captionStyles.pruneLearnedExamples(post.tenantId, platform, 10)

          console.log(
            `[CRON] Learned caption for tenant ${post.tenantId}, platform ${platform}`
          )

          results.push({
            tenantId: post.tenantId,
            platform,
            success: true,
          })
          learned++
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.error(
            `[CRON] Error learning caption for tenant ${post.tenantId}:`,
            error
          )

          results.push({
            tenantId: post.tenantId,
            platform,
            success: false,
            error: errorMessage,
          })
        }
      }
    }

    console.log(
      `[CRON] Caption learning complete: ${learned} learned, ${skipped} skipped`
    )

    return NextResponse.json({
      success: true,
      processed: recentPosts.length,
      learned,
      skipped,
      results,
    })
  } catch (error) {
    console.error('[CRON] Caption learning error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process learning',
        success: false,
      },
      { status: 500 }
    )
  }
}

// Allow manual trigger via POST
export async function POST(request: NextRequest) {
  return GET(request)
}
