import { timingSafeEqual } from 'node:crypto'
import { stockReservations } from '@madebuy/db'
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
 * GET/POST /api/cron/cleanup-reservations
 *
 * Stock reservation cleanup cron endpoint.
 * Called by Vercel Cron (or external cron service) to clean up expired stock reservations.
 *
 * Vercel cron config: Set path to /api/cron/cleanup-reservations, schedule every 5 minutes
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

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

    console.log('[CRON] Cleaning up expired stock reservations...')

    // Clean up expired reservations
    const cleanupCount = await stockReservations.cleanupExpiredReservations()

    console.log(`[CRON] Cleaned up ${cleanupCount} expired reservations`)

    return NextResponse.json({
      success: true,
      cleanupCount,
      message: `Cleaned up ${cleanupCount} expired stock reservations`,
    })
  } catch (error) {
    console.error('[CRON] Stock reservation cleanup error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to clean up stock reservations',
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
