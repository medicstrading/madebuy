import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { tenants } from '@madebuy/db'

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
    // Verify cron secret to prevent unauthorized access (timing-safe)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting monthly usage reset...')

    // Get all tenants that need their usage reset
    const tenantsToReset = await tenants.getTenantsNeedingUsageReset()

    console.log(`[CRON] Found ${tenantsToReset.length} tenants needing usage reset`)

    if (tenantsToReset.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No tenants need usage reset'
      })
    }

    const results: ResetResult[] = []

    for (const tenant of tenantsToReset) {
      try {
        await tenants.resetMonthlyUsage(tenant.id)

        console.log(`[CRON] Reset usage for tenant ${tenant.id}`)
        results.push({
          tenantId: tenant.id,
          success: true
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[CRON] Failed to reset usage for tenant ${tenant.id}:`, error)
        results.push({
          tenantId: tenant.id,
          success: false,
          error: errorMessage
        })
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[CRON] Usage reset completed: ${succeeded} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: tenantsToReset.length,
      succeeded,
      failed,
      results
    })

  } catch (error) {
    console.error('[CRON] Usage reset error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reset usage',
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
