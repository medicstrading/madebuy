import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@madebuy/db'
import { publish } from '@madebuy/db'

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

  const results = await db.collection('publish_records')
    .find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    })
    .sort({ scheduledFor: 1 })
    .project({ id: 1, tenantId: 1, scheduledFor: 1 })
    .toArray()

  return results as unknown as ScheduledRecord[]
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[CRON] Unauthorized request - invalid or missing authorization header')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Checking for scheduled posts...')

    // Get all records across all tenants that are scheduled and ready
    const scheduledRecords = await getScheduledRecordsReady()

    console.log(`[CRON] Found ${scheduledRecords.length} posts ready to publish`)

    if (scheduledRecords.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: 'No scheduled posts ready to publish'
      })
    }

    const results: ProcessResult[] = []

    for (const record of scheduledRecords) {
      try {
        console.log(`[CRON] Processing record ${record.id} for tenant ${record.tenantId}...`)

        // Mark as publishing first to prevent duplicate processing
        await publish.updatePublishRecord(record.tenantId, record.id, {
          status: 'publishing'
        })

        // Call the execute endpoint to publish
        // Use the internal app URL for server-to-server calls
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3300'

        const executeResponse = await fetch(
          `${appUrl}/api/publish/${record.id}/execute`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Pass cron secret for internal auth if needed
              ...(cronSecret && { 'X-Cron-Secret': cronSecret })
            }
          }
        )

        const executeData = await executeResponse.json()

        if (executeResponse.ok && executeData.success) {
          console.log(`[CRON] Successfully published record ${record.id}`)
          results.push({
            recordId: record.id,
            tenantId: record.tenantId,
            success: true
          })
        } else {
          console.error(`[CRON] Failed to publish record ${record.id}:`, executeData.error)

          // Mark as failed with error message
          await publish.updatePublishRecord(record.tenantId, record.id, {
            status: 'failed',
            results: [{
              platform: 'system' as any,
              status: 'failed',
              error: executeData.error || 'Unknown execution error'
            }]
          })

          results.push({
            recordId: record.id,
            tenantId: record.tenantId,
            success: false,
            error: executeData.error || 'Unknown execution error'
          })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[CRON] Error processing record ${record.id}:`, error)

        // Mark as failed
        await publish.updatePublishRecord(record.tenantId, record.id, {
          status: 'failed',
          results: [{
            platform: 'system' as any,
            status: 'failed',
            error: errorMessage
          }]
        })

        results.push({
          recordId: record.id,
          tenantId: record.tenantId,
          success: false,
          error: errorMessage
        })
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[CRON] Completed: ${succeeded} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: scheduledRecords.length,
      succeeded,
      failed,
      results
    })

  } catch (error) {
    console.error('[CRON] Scheduled publish error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process scheduled posts',
        success: false
      },
      { status: 500 }
    )
  }
}

// Allow manual trigger via POST as well
export async function POST(request: NextRequest) {
  return GET(request)
}
