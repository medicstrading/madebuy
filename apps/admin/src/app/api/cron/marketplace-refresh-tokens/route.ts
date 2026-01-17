import { timingSafeEqual } from 'node:crypto'
import { marketplace } from '@madebuy/db'
import type { MarketplaceConnection } from '@madebuy/shared'
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
 * GET /api/cron/marketplace-refresh-tokens
 *
 * Refreshes OAuth tokens for marketplace connections before they expire.
 * Should be scheduled to run every 30 minutes.
 *
 * Vercel cron config: schedule "0,30 * * * *"
 *
 * Token lifetimes:
 * - eBay: 2 hours (refresh 30 min before expiry)
 * - Etsy: 1 hour (refresh 30 min before expiry)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RefreshResult {
  tenantId: string
  connectionId: string
  marketplace: string
  success: boolean
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - ALWAYS require auth, even if env var is missing
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting marketplace token refresh...')

    // Get connections needing refresh (expiring within 30 minutes)
    const connectionsNeedingRefresh =
      await marketplace.getConnectionsNeedingRefresh(30)

    if (connectionsNeedingRefresh.length === 0) {
      console.log('[CRON] No tokens need refreshing')
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No tokens need refreshing',
      })
    }

    console.log(
      `[CRON] Found ${connectionsNeedingRefresh.length} connections needing token refresh`,
    )

    const results: RefreshResult[] = []

    for (const connection of connectionsNeedingRefresh) {
      let result: RefreshResult

      switch (connection.marketplace) {
        case 'ebay':
          result = await refreshEbayToken(connection)
          break
        case 'etsy':
          result = await refreshEtsyToken(connection)
          break
        default:
          result = {
            tenantId: connection.tenantId,
            connectionId: connection.id,
            marketplace: connection.marketplace,
            success: false,
            error: `Unknown marketplace: ${connection.marketplace}`,
          }
      }

      results.push(result)
    }

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    console.log(
      `[CRON] Token refresh completed: ${succeeded} successful, ${failed} failed`,
    )

    return NextResponse.json({
      success: true,
      processed: connectionsNeedingRefresh.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('[CRON] Token refresh error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to refresh tokens',
        success: false,
      },
      { status: 500 },
    )
  }
}

/**
 * Refresh eBay OAuth token
 */
async function refreshEbayToken(
  connection: MarketplaceConnection,
): Promise<RefreshResult> {
  const baseResult = {
    tenantId: connection.tenantId,
    connectionId: connection.id,
    marketplace: 'ebay',
  }

  try {
    if (!connection.refreshToken) {
      await marketplace.updateConnectionStatus(
        connection.tenantId,
        connection.id,
        'expired',
        'No refresh token available',
      )
      return {
        ...baseResult,
        success: false,
        error: 'No refresh token available',
      }
    }

    const EBAY_TOKEN_URL =
      process.env.EBAY_ENVIRONMENT === 'production'
        ? 'https://api.ebay.com/identity/v1/oauth2/token'
        : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

    const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
    const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET

    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return {
        ...baseResult,
        success: false,
        error: 'eBay credentials not configured',
      }
    }

    const credentials = Buffer.from(
      `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    ).toString('base64')

    const response = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(
        `[CRON] eBay token refresh failed for ${connection.id}:`,
        errorData,
      )

      // Check if refresh token is invalid
      if (response.status === 400 || response.status === 401) {
        await marketplace.updateConnectionStatus(
          connection.tenantId,
          connection.id,
          'expired',
          'Refresh token expired or invalid',
        )
      }

      return {
        ...baseResult,
        success: false,
        error: `Token refresh failed: ${response.status}`,
      }
    }

    const tokenData = await response.json()

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    await marketplace.updateConnectionTokens(
      connection.tenantId,
      connection.id,
      tokenData.access_token,
      tokenData.refresh_token || connection.refreshToken,
      expiresAt,
    )

    console.log(`[CRON] Refreshed eBay token for connection ${connection.id}`)

    return {
      ...baseResult,
      success: true,
    }
  } catch (error) {
    console.error(
      `[CRON] Error refreshing eBay token for ${connection.id}:`,
      error,
    )
    return {
      ...baseResult,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Refresh Etsy OAuth token
 */
async function refreshEtsyToken(
  connection: MarketplaceConnection,
): Promise<RefreshResult> {
  const baseResult = {
    tenantId: connection.tenantId,
    connectionId: connection.id,
    marketplace: 'etsy',
  }

  try {
    if (!connection.refreshToken) {
      await marketplace.updateConnectionStatus(
        connection.tenantId,
        connection.id,
        'expired',
        'No refresh token available',
      )
      return {
        ...baseResult,
        success: false,
        error: 'No refresh token available',
      }
    }

    const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token'
    const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

    if (!ETSY_CLIENT_ID) {
      return {
        ...baseResult,
        success: false,
        error: 'Etsy credentials not configured',
      }
    }

    const response = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ETSY_CLIENT_ID,
        refresh_token: connection.refreshToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(
        `[CRON] Etsy token refresh failed for ${connection.id}:`,
        errorData,
      )

      if (response.status === 400 || response.status === 401) {
        await marketplace.updateConnectionStatus(
          connection.tenantId,
          connection.id,
          'expired',
          'Refresh token expired or invalid',
        )
      }

      return {
        ...baseResult,
        success: false,
        error: `Token refresh failed: ${response.status}`,
      }
    }

    const tokenData = await response.json()

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    await marketplace.updateConnectionTokens(
      connection.tenantId,
      connection.id,
      tokenData.access_token,
      tokenData.refresh_token || connection.refreshToken,
      expiresAt,
    )

    console.log(`[CRON] Refreshed Etsy token for connection ${connection.id}`)

    return {
      ...baseResult,
      success: true,
    }
  } catch (error) {
    console.error(
      `[CRON] Error refreshing Etsy token for ${connection.id}:`,
      error,
    )
    return {
      ...baseResult,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
