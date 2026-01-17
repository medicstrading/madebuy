import { timingSafeEqual } from 'node:crypto'
import { media } from '@madebuy/db'
import {
  getFromR2,
  processVideo,
  validateVideoDuration,
} from '@madebuy/storage'
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
// Max video duration in seconds
const MAX_VIDEO_DURATION = 60

/**
 * GET/POST /api/cron/process-videos
 *
 * Background job to process pending videos.
 * Called by Vercel Cron (or external cron service) to generate video thumbnails.
 *
 * Vercel cron config: Set path to /api/cron/process-videos, schedule every 1 minute
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for video processing

interface ProcessResult {
  mediaId: string
  tenantId: string
  success: boolean
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (timing-safe)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[VIDEO-CRON] Checking for pending videos...')

    // Get videos that need processing
    const pendingVideos = await media.getVideosPendingProcessing()

    console.log(
      `[VIDEO-CRON] Found ${pendingVideos.length} videos pending processing`,
    )

    if (pendingVideos.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: 'No videos pending processing',
      })
    }

    const results: ProcessResult[] = []

    for (const video of pendingVideos) {
      try {
        console.log(
          `[VIDEO-CRON] Processing video ${video.id} for tenant ${video.tenantId}...`,
        )

        // Mark as processing first to prevent duplicate processing
        await media.updateVideoProcessingStatus(
          video.tenantId,
          video.id,
          'processing',
        )

        // Get the video file from storage
        const videoKey = video.variants.original?.key
        if (!videoKey) {
          throw new Error('Video file not found in storage')
        }

        // Fetch video buffer from R2 storage
        const videoData = await getFromR2(videoKey)
        if (!videoData) {
          throw new Error('Failed to fetch video from storage')
        }
        const videoBuffer = Buffer.from(videoData)

        // Process the video (extract metadata and generate thumbnails)
        const processingResult = await processVideo({
          tenantId: video.tenantId,
          videoBuffer,
          fileName: video.originalFilename,
          mimeType: video.mimeType,
        })

        // Validate video duration
        if (
          !validateVideoDuration(
            processingResult.metadata.duration,
            MAX_VIDEO_DURATION,
          )
        ) {
          throw new Error(
            `Video duration ${processingResult.metadata.duration}s exceeds maximum of ${MAX_VIDEO_DURATION}s`,
          )
        }

        // Update the media record with metadata and thumbnails
        await media.updateVideoMetadata(
          video.tenantId,
          video.id,
          processingResult.metadata,
          {
            ...video.variants,
            thumb: processingResult.thumbnails.thumb,
            large: processingResult.thumbnails.large,
          },
        )

        console.log(`[VIDEO-CRON] Successfully processed video ${video.id}`)
        results.push({
          mediaId: video.id,
          tenantId: video.tenantId,
          success: true,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`[VIDEO-CRON] Error processing video ${video.id}:`, error)

        // Mark as failed with error message
        await media.updateVideoProcessingStatus(
          video.tenantId,
          video.id,
          'failed',
          errorMessage,
        )

        results.push({
          mediaId: video.id,
          tenantId: video.tenantId,
          success: false,
          error: errorMessage,
        })
      }
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[VIDEO-CRON] Completed: ${succeeded} successful, ${failed} failed`,
    )

    return NextResponse.json({
      success: true,
      processed: pendingVideos.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('[VIDEO-CRON] Video processing cron error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to process videos',
        success: false,
      },
      { status: 500 },
    )
  }
}

// Allow manual trigger via POST as well
export async function POST(request: NextRequest) {
  return GET(request)
}
