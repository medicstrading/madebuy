'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, ChevronRight } from 'lucide-react'
import type { Order } from '@madebuy/shared'

interface OrdersTableProps {
  orders: Order[]
}

/**
 * OrdersTable - Client component with search functionality
 *
 * Key behaviors:
 * - Empty search shows ALL results
 * - Clearing search returns to showing ALL results
 * - Search filters by order number, customer name, email
 */
export function OrdersTable({ orders }: OrdersTableProps) {
  // Search starts empty, showing all results
  const [search, setSearch] = useState('')

  // Filter orders based on search (empty = all results)
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    // Empty search returns all orders
    if (!query) {
      return orders
    }

    // Filter by order number, customer name, or email
    return orders.filter(order =>
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query)
    )
  }, [orders, search])

  const handleClearSearch = () => {
    setSearch('')  // Clear search, shows all results
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders by number, customer name, or email..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {search && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {search ? (
          <>
            Showing {filteredOrders.length} of {orders.length} orders
            {filteredOrders.length === 0 && (
              <span className="ml-1">
                - <button onClick={handleClearSearch} className="text-blue-600 hover:underline">Clear search</button> to see all orders
              </span>
            )}
          </>
        ) : (
          <>Showing all {orders.length} orders</>
        )}
      </div>

      {/* Orders Table */}
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
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No orders match your search
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 group">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/dashboard/orders/${order.id}`} className="block">
                      <div className="text-sm font-medium text-blue-600 group-hover:text-blue-800">
                        {order.orderNumber}
                      </div>
                      <div className="text-xs text-gray-500">{order.items.length} items</div>
                    </Link>
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
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-gray-400 group-hover:text-gray-600"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
