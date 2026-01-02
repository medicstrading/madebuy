import { requireTenant } from '@/lib/session'
import { orders } from '@madebuy/db'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Package, Truck, CheckCircle } from 'lucide-react'

export default async function OrdersPage() {
  const tenant = await requireTenant()

  // Fetch stats via aggregation and orders in parallel
  const [stats, allOrders] = await Promise.all([
    orders.getOrderStats(tenant.id),
    orders.listOrders(tenant.id)
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">Manage customer orders and fulfillment</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Pending" value={stats.pending} icon={ShoppingCart} color="yellow" />
        <StatCard title="Processing" value={stats.processing} icon={Package} color="blue" />
        <StatCard title="Shipped" value={stats.shipped} icon={Truck} color="purple" />
        <StatCard title="Delivered" value={stats.delivered} icon={CheckCircle} color="green" />
      </div>

      {allOrders.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No orders yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Orders from your website will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500">{order.items.length} items</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(order.total, order.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
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

function OrderStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  )
}
