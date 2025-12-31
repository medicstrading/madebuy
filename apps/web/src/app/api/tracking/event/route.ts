import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tracking, tenants } from '@madebuy/db'
import type { TrackingEventType } from '@madebuy/shared'
import { checkRateLimit } from '@/lib/rate-limit'

const ATTRIBUTION_COOKIE = 'mb_attribution'
const SESSION_COOKIE = 'mb_session'

/**
 * POST /api/tracking/event
 * Log a tracking event (page view, product view, etc.)
 */
export async function POST(request: NextRequest) {
  // Rate limit: 100 requests per minute per IP (analytics events are frequent)
  const rateLimitResponse = checkRateLimit(request, {
    limit: 100,
    windowMs: 60000,
    keyPrefix: 'tracking',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { tenantId, event, productId, path } = body

    // Validate input types to prevent NoSQL injection
    if (
      typeof tenantId !== 'string' ||
      typeof event !== 'string' ||
      typeof path !== 'string' ||
      (productId !== undefined && typeof productId !== 'string')
    ) {
      return NextResponse.json(
        { error: 'Invalid input type' },
        { status: 400 }
      )
    }

    if (!tenantId || !event || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, event, path' },
        { status: 400 }
      )
    }

    // Validate event type
    const validEvents: TrackingEventType[] = [
      'page_view',
      'product_view',
      'enquiry_submit',
      'checkout_start',
      'purchase',
    ]
    if (!validEvents.includes(event as TrackingEventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }
    const validEvent = event as TrackingEventType

    // Validate tenant exists before writing tracking data
    const tenant = await tenants.getTenantById(tenantId) || await tenants.getTenantBySlug(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Get attribution from cookies
    const cookieStore = await cookies()
    const attributionCookie = cookieStore.get(ATTRIBUTION_COOKIE)?.value
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value || 'unknown'

    let source = 'direct'
    if (attributionCookie) {
      try {
        const attribution = JSON.parse(attributionCookie)
        source = attribution.source || 'direct'
      } catch {
        // Ignore parse errors
      }
    }

    // Log the event (async, non-blocking) - use tenant.id for consistency
    tracking.logEvent(
      tenant.id,
      validEvent,
      source,
      path,
      sessionId,
      productId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking event error:', error)
    return NextResponse.json(
      { error: 'Failed to log event' },
      { status: 500 }
    )
  }
}
