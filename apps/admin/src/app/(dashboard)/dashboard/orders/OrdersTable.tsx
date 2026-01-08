'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, ChevronRight, ChevronDown, Check, Truck, Package, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import type { Order } from '@madebuy/shared'

interface OrdersTableProps {
  orders: Order[]
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

const BULK_ACTIONS: { value: OrderStatus; label: string; icon: typeof Truck }[] = [
  { value: 'processing', label: 'Mark as Processing', icon: Package },
  { value: 'shipped', label: 'Mark as Shipped', icon: Truck },
  { value: 'delivered', label: 'Mark as Delivered', icon: CheckCircle },
  { value: 'cancelled', label: 'Mark as Cancelled', icon: XCircle },
]

/**
 * OrdersTable - Client component with search and bulk actions
 *
 * Key behaviors:
 * - Empty search shows ALL results
 * - Clearing search returns to showing ALL results
 * - Search filters by order number, customer name, email
 * - Bulk selection with checkboxes
 * - Bulk status update via dropdown
 */
export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()
  // Search starts empty, showing all results
  const [search, setSearch] = useState('')
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Bulk action dropdown
  const [showBulkActions, setShowBulkActions] = useState(false)
  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<{ action: OrderStatus; label: string } | null>(null)
  // Loading state
  const [isUpdating, setIsUpdating] = useState(false)

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

  // Select all filtered orders
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)))
    } else {
      setSelectedIds(new Set())
    }
  }, [filteredOrders])

  // Toggle individual order selection
  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(orderId)
      } else {
        next.delete(orderId)
      }
      return next
    })
  }, [])

  // Handle bulk action selection
  const handleBulkActionClick = (action: OrderStatus, label: string) => {
    setShowBulkActions(false)
    setConfirmAction({ action, label })
  }

  // Execute bulk action
  const executeBulkAction = async () => {
    if (!confirmAction || selectedIds.size === 0) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedIds),
          action: confirmAction.action
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update orders')
      }

      // Clear selection and refresh page
      setSelectedIds(new Set())
      setConfirmAction(null)
      router.refresh()
    } catch (error) {
      console.error('Bulk update error:', error)
      alert(error instanceof Error ? error.message : 'Failed to update orders')
    } finally {
      setIsUpdating(false)
    }
  }

  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  return (
    <div className="space-y-4">
      {/* Search Bar and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by number, customer name, or email..."
            maxLength={200}
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

        {/* Bulk Actions Dropdown */}
        {selectedIds.size > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Bulk Actions ({selectedIds.size})
              <ChevronDown className="h-4 w-4" />
            </button>

            {showBulkActions && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowBulkActions(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    {BULK_ACTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => handleBulkActionClick(value, label)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
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
        {selectedIds.size > 0 && (
          <span className="ml-2 font-medium text-blue-600">
            ({selectedIds.size} selected)
          </span>
        )}
      </div>

      {/* Orders Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all orders"
                />
              </th>
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
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No orders match your search
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 group ${selectedIds.has(order.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="w-12 px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Select order ${order.orderNumber}`}
                    />
                  </td>
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Bulk Action
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to <strong>{confirmAction.label.toLowerCase()}</strong> for{' '}
              <strong>{selectedIds.size} order(s)</strong>?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This action will update all selected orders immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
