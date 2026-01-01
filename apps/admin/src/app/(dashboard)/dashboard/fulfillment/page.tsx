/**
 * Fulfillment Dashboard
 * - Orders awaiting shipment
 * - Recent shipments
 * - Shipment stats
 */

import { requireTenant } from '@/lib/session'
import { orders, shipments } from '@madebuy/db'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { OrdersAwaitingShipment } from '@/components/fulfillment/OrdersAwaitingShipment'
import { ShipmentCard } from '@/components/fulfillment/ShipmentCard'

export default async function FulfillmentPage() {
  const tenant = await requireTenant()

  // Get all orders that need shipping (paid, not shipped, not digital-only)
  const allOrders = await orders.listOrders(tenant.id)
  const awaitingShipment = allOrders.filter(o =>
    o.paymentStatus === 'paid' &&
    (o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing') &&
    !o.isDigitalOnly
  )

  // Get all shipments for stats
  const allShipments = await shipments.listShipments(tenant.id)
  const recentShipments = allShipments.slice(0, 10)

  // Calculate stats
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats = {
    awaiting: awaitingShipment.length,
    inTransit: allShipments.filter(s => s.status === 'in_transit').length,
    deliveredThisWeek: allShipments.filter(s =>
      s.status === 'delivered' &&
      s.deliveredAt &&
      new Date(s.deliveredAt) >= weekAgo
    ).length,
    pendingPickup: allShipments.filter(s => s.status === 'label_created').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fulfillment</h1>
          <p className="mt-2 text-gray-600">Manage shipping and order fulfillment</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Awaiting Shipment"
          value={stats.awaiting}
          icon={Clock}
          color="yellow"
          description="Orders ready to ship"
        />
        <StatCard
          title="Pending Pickup"
          value={stats.pendingPickup}
          icon={Package}
          color="blue"
          description="Labels printed, awaiting pickup"
        />
        <StatCard
          title="In Transit"
          value={stats.inTransit}
          icon={Truck}
          color="purple"
          description="Currently being delivered"
        />
        <StatCard
          title="Delivered This Week"
          value={stats.deliveredThisWeek}
          icon={CheckCircle}
          color="green"
          description="Successfully delivered"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Orders Awaiting Shipment */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Orders Awaiting Shipment</h2>
              <p className="text-sm text-gray-500">Paid orders that need to be shipped</p>
            </div>

            {awaitingShipment.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="mt-2 text-sm text-gray-600">
                  No orders waiting to be shipped.
                </p>
              </div>
            ) : (
              <OrdersAwaitingShipment orders={awaitingShipment} />
            )}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
              <p className="text-sm text-gray-500">Last 10 shipments</p>
            </div>

            {recentShipments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No shipments yet</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Shipments will appear here once you start shipping orders.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentShipments.map((shipment) => (
                  <ShipmentCard key={shipment.id} shipment={shipment} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'yellow' | 'blue' | 'purple' | 'green'
  description: string
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
