import { timingSafeEqual } from 'node:crypto'
import { tenants } from '@madebuy/db'
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
 * GET/POST /api/cron/reset-usage
 *
 * Monthly usage reset cron endpoint.
 * Resets monthly counters (AI captions, orders) for all tenants.
 *
 * Should be scheduled to run on the 1st of each month.
 * Vercel cron config: schedule "0 0 1 * *" (midnight on the 1st)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

interface ResetResult {
  tenantId: string
  success: boolean
  error?: string
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

    console.log('[CRON] Starting monthly usage reset...')

    // Process tenants in batches to avoid OOM
    const BATCH_SIZE = 100
    const MAX_TOTAL_PROCESSED = 1000 // Safety limit per cron invocation
    let totalProcessed = 0
    const results: ResetResult[] = []
    let lastId: string | undefined = undefined

    while (totalProcessed < MAX_TOTAL_PROCESSED) {
      // Get next batch of tenants
      const tenantsToReset = await tenants.getTenantsNeedingUsageReset(
        BATCH_SIZE,
        lastId,
      )

      console.log(
        `[CRON] Found ${tenantsToReset.length} tenants needing usage reset in this batch`,
      )

      if (tenantsToReset.length === 0) {
        break
      }

      for (const tenant of tenantsToReset) {
        try {
          await tenants.resetMonthlyUsage(tenant.id)

          console.log(`[CRON] Reset usage for tenant ${tenant.id}`)
          results.push({
            tenantId: tenant.id,
            success: true,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.error(
            `[CRON] Failed to reset usage for tenant ${tenant.id}:`,
            error,
          )
          results.push({
            tenantId: tenant.id,
            success: false,
            error: errorMessage,
          })
        }
        totalProcessed++
      }

      // Set cursor for next batch
      lastId = tenantsToReset[tenantsToReset.length - 1]?.id

      // If we got fewer results than batch size, we're done
      if (tenantsToReset.length < BATCH_SIZE) {
        break
      }
    }

    if (totalProcessed === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No tenants need usage reset',
      })
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[CRON] Usage reset completed: ${succeeded} successful, ${failed} failed out of ${totalProcessed} total`,
    )

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      succeeded,
      failed,
      results: results.slice(0, 100), // Limit response size
    })
  } catch (error) {
    console.error('[CRON] Usage reset error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reset usage',
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
