import { timingSafeEqual } from 'node:crypto'
import { captionStyles, getDatabase } from '@madebuy/db'
import type { PublishRecord, SocialPlatform } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'

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
 * @param daysAgo How many days back to fetch posts
 * @param limit Maximum number of posts to return
 * @param afterId Cursor for pagination - return posts after this ID
 */
async function getRecentlyPublishedPosts(
  daysAgo: number = 7,
  limit = 100,
  afterId?: string,
): Promise<PublishRecord[]> {
  const db = await getDatabase()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

  const query: any = {
    status: 'published',
    publishedAt: { $gte: cutoffDate },
    // Has at least one successful result
    'results.status': 'success',
  }

  // Add cursor condition if provided
  if (afterId) {
    query.id = { $gt: afterId }
  }

  const results = await db
    .collection('publish_records')
    .find(query)
    .sort({ id: 1 }) // Consistent ordering for pagination
    .limit(limit)
    .toArray()

  return results as unknown as PublishRecord[]
}

/**
 * Check if a caption has already been learned
 */
async function isAlreadyLearned(
  tenantId: string,
  platform: SocialPlatform,
  publishRecordId: string,
): Promise<boolean> {
  const profile = await captionStyles.getCaptionStyleProfile(tenantId, platform)
  if (!profile) return false

  return profile.learnedExamples.some(
    (ex) => ex.publishRecordId === publishRecordId,
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET must be configured - fail closed if missing
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify the provided secret matches (timing-safe)
    if (!verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting caption learning job...')

    // Process posts in batches to avoid OOM
    const BATCH_SIZE = 100
    const MAX_TOTAL_POSTS = 500 // Safety limit per cron invocation
    const results: LearnResult[] = []
    let learned = 0
    let skipped = 0
    let totalPosts = 0
    let lastId: string | undefined = undefined

    while (totalPosts < MAX_TOTAL_POSTS) {
      // Get recently published posts in batches
      const recentPosts = await getRecentlyPublishedPosts(7, BATCH_SIZE, lastId)

      console.log(
        `[CRON] Found ${recentPosts.length} recently published posts in this batch`,
      )

      if (recentPosts.length === 0) {
        break
      }

      for (const post of recentPosts) {
        totalPosts++

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
              platform,
            )

            // If no profile, create one with defaults
            if (!profile) {
              profile = await captionStyles.createCaptionStyleProfile(
                post.tenantId,
                { platform },
              )
            }

            // Add learned example
            await captionStyles.addLearnedExample(
              post.tenantId,
              platform,
              caption,
              post.id,
            )

            // Prune to keep only latest 10
            await captionStyles.pruneLearnedExamples(post.tenantId, platform, 10)

            console.log(
              `[CRON] Learned caption for tenant ${post.tenantId}, platform ${platform}`,
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
              error,
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

      // Set cursor for next batch
      lastId = recentPosts[recentPosts.length - 1]?.id

      // If we got fewer results than batch size, we're done
      if (recentPosts.length < BATCH_SIZE) {
        break
      }
    }

    if (totalPosts === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        learned: 0,
        skipped: 0,
        message: 'No recent posts to learn from',
      })
    }

    console.log(
      `[CRON] Caption learning complete: ${learned} learned, ${skipped} skipped out of ${totalPosts} posts`,
    )

    return NextResponse.json({
      success: true,
      processed: totalPosts,
      learned,
      skipped,
      results: results.slice(0, 100), // Limit response size
    })
  } catch (error) {
    console.error('[CRON] Caption learning error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process learning',
        success: false,
      },
      { status: 500 },
    )
  }
}

// Allow manual trigger via POST
export async function POST(request: NextRequest) {
  return GET(request)
}
