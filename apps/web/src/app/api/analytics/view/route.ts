import { NextRequest, NextResponse } from 'next/server'
import { analytics } from '@madebuy/db'

/**
 * POST /api/analytics/view
 * Record a product view for analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, pieceId } = body

    if (!tenantId || !pieceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await analytics.recordProductView(tenantId, pieceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording view:', error)
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    )
  }
}
