import { orders, pieces, tenants } from '@madebuy/db'
import { getPendingCelebrations } from '@madebuy/shared'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/celebrations
 * Returns pending celebrations that haven't been shown yet
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts - handle paginated results
    const piecesResult = await pieces.listPieces(tenant.id)
    const ordersResult = await orders.listOrders(tenant.id)

    const productCount = Array.isArray(piecesResult)
      ? piecesResult.length
      : piecesResult.data.length

    const orderCount = Array.isArray(ordersResult)
      ? ordersResult.length
      : ordersResult.data.length

    // Check if store is published (has custom domain or website design configured)
    const isStorePublished = !!(
      tenant.customDomain || tenant.websiteDesign?.template
    )

    // Get pending celebrations
    const pending = getPendingCelebrations({
      productCount,
      orderCount,
      isStorePublished,
      alreadyShown: tenant.celebrationsShown || [],
    })

    return NextResponse.json({
      celebrations: pending,
    })
  } catch (error) {
    console.error('Error fetching celebrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/celebrations
 * Marks a celebration as shown
 */
export async function POST(request: Request) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { celebrationId } = await request.json()

    if (!celebrationId || typeof celebrationId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid celebration ID' },
        { status: 400 },
      )
    }

    // Add to celebrationsShown array
    const alreadyShown = tenant.celebrationsShown || []
    if (!alreadyShown.includes(celebrationId)) {
      await tenants.updateTenant(tenant.id, {
        celebrationsShown: [...alreadyShown, celebrationId],
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking celebration as shown:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
