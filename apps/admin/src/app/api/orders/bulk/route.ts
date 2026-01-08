import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders } from '@madebuy/db'

/**
 * Bulk update orders
 * POST /api/orders/bulk
 * Body: { orderIds: string[], action: 'shipped' | 'delivered' | 'processing' | 'cancelled' }
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderIds, action } = body

    // Validate orderIds
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Limit to 100 orders at a time
    if (orderIds.length > 100) {
      return NextResponse.json(
        { error: 'Cannot update more than 100 orders at once' },
        { status: 400 }
      )
    }

    // Perform bulk update
    const updatedCount = await orders.bulkUpdateOrderStatus(
      tenant.id,
      orderIds,
      action
    )

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully updated ${updatedCount} order(s) to ${action}`
    })
  } catch (error) {
    console.error('Error in bulk order update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
