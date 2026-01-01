'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Banknote,
} from 'lucide-react'

interface RecentPayout {
  id: string
  amount: number
  status: string
  arrivalDate: string
  destinationLast4?: string
}

interface PayoutAnalytics {
  pendingAmount: number
  nextPayoutDate: string | null
  recentPayouts: RecentPayout[]
  totalPaidOut: number
  hasConnectAccount: boolean
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not scheduled'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateString)
}

function PayoutStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ElementType }
  > = {
    paid: {
      label: 'Paid',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
    in_transit: {
      label: 'In Transit',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Banknote,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-50 text-gray-600 border-gray-200',
      icon: AlertCircle,
    },
  }

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export function PayoutsWidget() {
  const [data, setData] = useState<PayoutAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPayoutAnalytics() {
      try {
        const response = await fetch('/api/analytics/payouts')
        if (!response.ok) {
          throw new Error('Failed to fetch payout data')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchPayoutAnalytics()
  }, [])

  // Loading state
  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Payouts</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </section>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Payouts</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Unable to load payout data</p>
          </div>
        </div>
      </section>
    )
  }

  // Empty state - no Connect account
  if (!data.hasConnectAccount) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Payouts</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-amber-50 p-3 mb-4">
              <Wallet className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Set up payouts
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-[240px]">
              Connect your bank account to receive payments from your sales.
            </p>
            <Link
              href="/dashboard/settings/payments"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Set up payments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Main widget with data
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">Payouts</h2>
        </div>
        <Link
          href="/dashboard/payouts"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Pending amount */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg bg-blue-500 p-1.5">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-700">Pending</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(data.pendingAmount)}
            </p>
            {data.nextPayoutDate && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Est. {formatDate(data.nextPayoutDate)}
              </p>
            )}
          </div>

          {/* Total paid this month */}
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg bg-green-500 p-1.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-green-700">
                This Month
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(data.totalPaidOut)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total paid out</p>
          </div>
        </div>

        {/* Recent payouts list */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Payouts
          </h3>

          {data.recentPayouts.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Banknote className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No payouts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payout.amount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeDate(payout.arrivalDate)}
                        {payout.destinationLast4 &&
                          ` • ****${payout.destinationLast4}`}
                      </span>
                    </div>
                  </div>
                  <PayoutStatusBadge status={payout.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default PayoutsWidget
