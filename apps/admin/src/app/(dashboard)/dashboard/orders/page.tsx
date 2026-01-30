import { orders } from '@madebuy/db'
import { CheckCircle, Package, ShoppingCart, Truck } from 'lucide-react'
import { requireTenant } from '@/lib/session'
import { OrdersTable } from './OrdersTable'

export default async function OrdersPage() {
  const tenant = await requireTenant()

  // Fetch stats via aggregation and orders in parallel
  const [stats, ordersResult] = await Promise.all([
    orders.getOrderStats(tenant.id),
    orders.listOrders(tenant.id),
  ])

  const allOrders = 'data' in ordersResult ? ordersResult.data : ordersResult

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">
          Manage customer orders and fulfillment
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={ShoppingCart}
          color="yellow"
        />
        <StatCard
          title="Processing"
          value={stats.processing}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Shipped"
          value={stats.shipped}
          icon={Truck}
          color="purple"
        />
        <StatCard
          title="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {allOrders.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No orders yet
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Orders from your website will appear here.
          </p>
        </div>
      ) : (
        <OrdersTable orders={allOrders} />
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: any
  color: 'yellow' | 'blue' | 'purple' | 'green'
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
