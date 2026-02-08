import { timingSafeEqual } from 'node:crypto'
import { getDatabase, publish, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { executePublishRecord } from '@/lib/publish-execute'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      // Compare against expected anyway to prevent timing leaks
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * GET/POST /api/cron/publish
 *
 * Scheduled publishing cron endpoint.
 * Called by Vercel Cron (or external cron service) to process scheduled posts.
 *
 * Vercel cron config: Set path to /api/cron/publish, schedule every 5 minutes
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

interface ScheduledRecord {
  id: string
  tenantId: string
  scheduledFor: Date
}

interface ProcessResult {
  recordId: string
  tenantId: string
  success: boolean
  error?: string
}

/**
 * Get all scheduled publish records across all tenants that are due
 */
async function getScheduledRecordsReady(): Promise<ScheduledRecord[]> {
  const db = await getDatabase()
  const now = new Date()

  const results = await db
    .collection('publish_records')
    .find({
      status: 'scheduled',
      scheduledFor: { $lte: now },
    })
    .sort({ scheduledFor: 1 })
    .project({ id: 1, tenantId: 1, scheduledFor: 1 })
    .toArray()

  return results as unknown as ScheduledRecord[]
}

/**
 * Get stuck publishing records (stuck in "publishing" for more than 10 minutes)
 */
async function getStuckPublishingRecords(): Promise<ScheduledRecord[]> {
  const db = await getDatabase()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  const results = await db
    .collection('publish_records')
    .find({
      status: 'publishing',
      updatedAt: { $lt: tenMinutesAgo },
    })
    .project({ id: 1, tenantId: 1, scheduledFor: 1 })
    .toArray()

  return results as unknown as ScheduledRecord[]
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (fail-closed)
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

    console.log('[CRON] Checking for scheduled posts...')

    // First, recover stuck publishing records (stuck in "publishing" for more than 10 minutes)
    const stuckRecords = await getStuckPublishingRecords()
    if (stuckRecords.length > 0) {
      console.log(
        `[CRON] Found ${stuckRecords.length} stuck publishing records, resetting to scheduled...`,
      )
      for (const record of stuckRecords) {
        await publish.updatePublishRecord(record.tenantId, record.id, {
          status: 'scheduled',
          results: [
            {
              platform: 'system' as any,
              status: 'failed',
              error: 'Reset from stuck publishing state',
            },
          ],
        })
      }
    }

    // Get all records across all tenants that are scheduled and ready
    const scheduledRecords = await getScheduledRecordsReady()

    console.log(
      `[CRON] Found ${scheduledRecords.length} posts ready to publish`,
    )

    if (scheduledRecords.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        recovered: stuckRecords.length,
        message: 'No scheduled posts ready to publish',
      })
    }

    const results: ProcessResult[] = []

    for (const record of scheduledRecords) {
      try {
        console.log(
          `[CRON] Processing record ${record.id} for tenant ${record.tenantId}...`,
        )

        // Check feature gate - skip if tenant doesn't have socialPublishing
        const tenant = await tenants.getTenantById(record.tenantId)
        if (!tenant?.features?.socialPublishing) {
          console.warn(
            `[CRON] Skipping record ${record.id} - tenant ${record.tenantId} does not have socialPublishing enabled`,
          )
          results.push({
            recordId: record.id,
            tenantId: record.tenantId,
            success: false,
            error: 'Social publishing not enabled on plan',
          })
          continue
        }

        // Call the publish execution logic directly (no HTTP request needed)
        // This avoids the session auth requirement of the /api/publish/[id]/execute endpoint
        const executeResult = await executePublishRecord(record.tenantId, record.id)

        if (executeResult.success) {
          console.log(`[CRON] Successfully published record ${record.id}`)

          // Handle recurring posts
          const fullRecord = await publish.getPublishRecordById(record.tenantId, record.id)
          if (fullRecord?.recurrence?.enabled) {
            console.log(
              `[CRON] Record ${record.id} has recurrence enabled, processing...`,
            )

            // Update recurrence progress
            await publish.updateRecurrenceProgress(record.id)

            // Create next occurrence if needed
            const nextRecord = await publish.createNextOccurrence(fullRecord)
            if (nextRecord) {
              console.log(
                `[CRON] Created next occurrence ${nextRecord.id} scheduled for ${nextRecord.scheduledFor}`,
              )
            } else {
              console.log(`[CRON] No more occurrences needed for ${record.id}`)
            }
          }

          results.push({
            recordId: record.id,
            tenantId: record.tenantId,
            success: true,
          })
        } else {
          const execError = executeResult.error || 'Unknown execution error'
          console.error(
            `[CRON] Failed to publish record ${record.id}:`,
            execError,
          )

          // executePublishRecord already updates the record status to 'failed',
          // so no need to update it again here

          results.push({
            recordId: record.id,
            tenantId: record.tenantId,
            success: false,
            error: execError,
          })
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        console.error(`[CRON] Error processing record ${record.id}:`, error)

        // Mark as failed
        await publish.updatePublishRecord(record.tenantId, record.id, {
          status: 'failed',
          results: [
            {
              platform: 'system' as any,
              status: 'failed',
              error: errorMessage,
            },
          ],
        })

        results.push({
          recordId: record.id,
          tenantId: record.tenantId,
          success: false,
          error: errorMessage,
        })
      }
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[CRON] Completed: ${succeeded} successful, ${failed} failed, ${stuckRecords.length} recovered`,
    )

    return NextResponse.json({
      success: true,
      processed: scheduledRecords.length,
      succeeded,
      failed,
      recovered: stuckRecords.length,
      results,
    })
  } catch (error) {
    console.error('[CRON] Scheduled publish error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process scheduled posts',
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
