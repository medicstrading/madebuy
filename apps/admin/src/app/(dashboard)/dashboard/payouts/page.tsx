'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wallet,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import type { Payout, PayoutStatus } from '@madebuy/shared'

const PAYOUT_STATUSES: { value: PayoutStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

interface PayoutSummary {
  period: { startDate: string; endDate: string }
  payouts: {
    totalPaid: number
    totalPending: number
    count: number
    averageAmount: number
    failedCount: number
  }
  balance: {
    pendingPayout: number
    inTransit: number
    nextPayoutDate: string | null
    unpaidSales: number
    unpaidCount: number
  }
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState('30d')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Pagination
  const [page, setPage] = useState(0)
  const [limit] = useState(20)

  const calculateDateRange = useCallback(() => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date = now

    if (dateRange === 'custom' && customStartDate) {
      startDate = new Date(customStartDate)
      if (customEndDate) {
        endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
      }
    } else {
      switch (dateRange) {
        case '7d':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 90)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }
    }

    return { startDate, endDate }
  }, [dateRange, customStartDate, customEndDate])

  const fetchPayouts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const { startDate, endDate } = calculateDateRange()

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (startDate) {
        params.set('startDate', startDate.toISOString())
      }
      params.set('endDate', endDate.toISOString())
      params.set('limit', limit.toString())
      params.set('offset', (page * limit).toString())

      const [payoutsRes, summaryRes] = await Promise.all([
        fetch(`/api/payouts?${params}`),
        fetch(`/api/payouts/summary?startDate=${startDate?.toISOString()}&endDate=${endDate.toISOString()}`),
      ])

      if (!payoutsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch payouts')
      }

      const payoutsData = await payoutsRes.json()
      const summaryData = await summaryRes.json()

      setPayouts(payoutsData.payouts)
      setTotal(payoutsData.total)
      setSummary(summaryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, calculateDateRange, page, limit])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [statusFilter, dateRange, customStartDate, customEndDate])

  const exportCSV = () => {
    if (payouts.length === 0) return

    const headers = ['Date', 'Amount', 'Status', 'Bank', 'Arrival Date', 'Method']
    const rows = payouts.map((p) => [
      formatDate(p.createdAt),
      (p.amount / 100).toFixed(2),
      p.status,
      p.destinationBankName || '-',
      p.arrivalDate ? formatDate(p.arrivalDate) : '-',
      p.method,
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payouts-export-${formatDate(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
          <p className="mt-2 text-gray-600">Track your earnings and bank transfers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayouts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={payouts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Available Balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unpaid Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.balance.unpaidSales)}
                </p>
                <p className="text-xs text-gray-400">
                  {summary.balance.unpaidCount} transaction{summary.balance.unpaidCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* In Transit */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.balance.inTransit)}
                </p>
                {summary.balance.nextPayoutDate && (
                  <p className="text-xs text-gray-400">
                    Next: {formatDate(summary.balance.nextPayoutDate)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid ({dateRange === 'custom' ? 'Custom' : dateRange})</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.payouts.totalPaid)}
                </p>
                <p className="text-xs text-gray-400">
                  {summary.payouts.count} payout{summary.payouts.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Average Payout */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Payout</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.payouts.averageAmount)}
                </p>
                {summary.payouts.failedCount > 0 && (
                  <p className="text-xs text-red-500">
                    {summary.payouts.failedCount} failed
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PAYOUT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {DATE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {total} payout{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Payouts Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && payouts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No payouts yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Payouts will appear here once Stripe processes your earnings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Arrival Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <PayoutStatusBadge status={payout.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {payout.destinationBankName && payout.destinationLast4 ? (
                        <span>
                          {payout.destinationBankName} •••• {payout.destinationLast4}
                        </span>
                      ) : payout.destinationLast4 ? (
                        <span>•••• {payout.destinationLast4}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {payout.arrivalDate ? formatDate(payout.arrivalDate) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 capitalize">
                      {payout.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
            <div className="text-sm text-gray-500">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h4 className="font-medium text-blue-900">How payouts work</h4>
            <p className="mt-1 text-sm text-blue-700">
              Stripe automatically transfers your earnings to your bank account every 3 business days.
              You can view your payout schedule and bank details in your Stripe Express Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const config: Record<PayoutStatus, { label: string; className: string; icon: typeof Clock }> = {
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
    },
    in_transit: {
      label: 'In Transit',
      className: 'bg-blue-100 text-blue-800',
      icon: ArrowUpRight,
    },
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-800',
      icon: CheckCircle,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800',
      icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-800',
      icon: XCircle,
    },
  }

  const { label, className, icon: Icon } = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
