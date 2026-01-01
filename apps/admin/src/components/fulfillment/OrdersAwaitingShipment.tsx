'use client'

import { Order } from '@madebuy/shared'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Truck, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface OrdersAwaitingShipmentProps {
  orders: Order[]
}

export function OrdersAwaitingShipment({ orders }: OrdersAwaitingShipmentProps) {
  return (
    <div className="overflow-x-auto">
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
              Items
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Shipping
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Date
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                <div className="text-xs text-gray-500 capitalize">{order.status}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{order.customerName}</div>
                <div className="text-xs text-gray-500">{order.shippingAddress.city}, {order.shippingAddress.state}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {order.items.slice(0, 2).map((item, index) => (
                    item.imageUrl ? (
                      <img
                        key={index}
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div key={index} className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                        <Package className="h-4 w-4 text-gray-400" />
                      </div>
                    )
                  ))}
                  {order.items.length > 2 && (
                    <span className="text-xs text-gray-500">+{order.items.length - 2}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {formatCurrency(order.total, order.currency)}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{order.shippingMethod}</div>
                <div className="text-xs text-gray-500 capitalize">{order.shippingType.replace('_', ' ')}</div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(order.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <Link
                  href={`/dashboard/fulfillment/${order.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  Ship
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
