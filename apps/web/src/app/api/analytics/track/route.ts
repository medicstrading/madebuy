import { analytics } from '@madebuy/db'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Get or create a session ID for analytics tracking
function getSessionId(): string {
  const cookieStore = cookies()
  let sessionId = cookieStore.get('analytics_session')?.value

  if (!sessionId) {
    sessionId = nanoid()
    // Note: In production you'd want to set this cookie properly
  }

  return sessionId
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, event, productId, orderId, metadata } = body

    if (!tenantId || !event) {
      return NextResponse.json(
        { error: 'tenantId and event are required' },
        { status: 400 },
      )
    }

    // Validate event type
    const validEvents = [
      'view_product',
      'add_to_cart',
      'start_checkout',
      'complete_purchase',
    ]
    if (!validEvents.includes(event)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const sessionId = getSessionId()

    await analytics.trackEvent(tenantId, event, sessionId, {
      productId,
      orderId,
      metadata,
    })

    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('Error tracking analytics event:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 },
    )
  }
}
