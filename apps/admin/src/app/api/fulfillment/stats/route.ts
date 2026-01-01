/**
 * GET /api/fulfillment/stats
 * Get fulfillment statistics for the current tenant
 *
 * Returns: {
 *   awaitingShipment: number,
 *   pendingPickup: number,
 *   inTransit: number,
 *   deliveredThisWeek: number,
 *   deliveredThisMonth: number,
 *   totalShipments: number,
 *   averageDeliveryDays: number | null
 * }
 */

import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders, shipments } from '@madebuy/db'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all orders and shipments
    const allOrders = await orders.listOrders(tenant.id)
    const allShipments = await shipments.listShipments(tenant.id)

    // Calculate date boundaries
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Orders awaiting shipment (paid, not shipped, not digital-only)
    const awaitingShipment = allOrders.filter(o =>
      o.paymentStatus === 'paid' &&
      (o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing') &&
      !o.isDigitalOnly
    ).length

    // Shipment status counts
    const pendingPickup = allShipments.filter(s => s.status === 'label_created').length
    const inTransit = allShipments.filter(s => s.status === 'in_transit').length

    // Delivered counts
    const deliveredThisWeek = allShipments.filter(s =>
      s.status === 'delivered' &&
      s.deliveredAt &&
      new Date(s.deliveredAt) >= weekAgo
    ).length

    const deliveredThisMonth = allShipments.filter(s =>
      s.status === 'delivered' &&
      s.deliveredAt &&
      new Date(s.deliveredAt) >= monthAgo
    ).length

    // Calculate average delivery time (in days)
    const deliveredShipments = allShipments.filter(s =>
      s.status === 'delivered' &&
      s.shippedAt &&
      s.deliveredAt
    )

    let averageDeliveryDays: number | null = null

    if (deliveredShipments.length > 0) {
      const totalDays = deliveredShipments.reduce((sum, s) => {
        const shippedDate = new Date(s.shippedAt!)
        const deliveredDate = new Date(s.deliveredAt!)
        const days = (deliveredDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
        return sum + days
      }, 0)

      averageDeliveryDays = Math.round(totalDays / deliveredShipments.length * 10) / 10
    }

    // Carrier breakdown
    const carrierCounts = allShipments.reduce((acc, s) => {
      const carrier = s.carrier || 'unknown'
      acc[carrier] = (acc[carrier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      awaitingShipment,
      pendingPickup,
      inTransit,
      deliveredThisWeek,
      deliveredThisMonth,
      totalShipments: allShipments.length,
      averageDeliveryDays,
      carrierBreakdown: carrierCounts,
    })
  } catch (error) {
    console.error('Error getting fulfillment stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stats' },
      { status: 500 }
    )
  }
}
