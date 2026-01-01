'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react'

interface RevenueStats {
  today: number
  week: number
  month: number
  todayChange: number
  weekChange: number
  monthChange: number
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatCurrencyDetailed(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function RevenueWidget() {
  const [data, setData] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analytics/revenue')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch revenue data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  if (loading) {
    return <RevenueWidgetSkeleton />
  }

  if (error || !data) {
    return <RevenueWidgetError error={error} onRetry={fetchRevenue} />
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500 p-1.5">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Revenue</h2>
        </div>
        <button
          onClick={fetchRevenue}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          title="Refresh revenue data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <RevenueCard
            label="Today"
            amount={data.today}
            change={data.todayChange}
            period="vs yesterday"
          />
          <RevenueCard
            label="This Week"
            amount={data.week}
            change={data.weekChange}
            period="vs last week"
          />
          <RevenueCard
            label="This Month"
            amount={data.month}
            change={data.monthChange}
            period="vs last month"
            featured
          />
        </div>
      </div>
    </section>
  )
}

function RevenueCard({
  label,
  amount,
  change,
  period,
  featured = false,
}: {
  label: string
  amount: number
  change: number
  period: string
  featured?: boolean
}) {
  const isPositive = change >= 0
  const isNeutral = change === 0

  return (
    <div
      className={`rounded-xl p-5 transition-all hover:shadow-md ${
        featured
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200'
          : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            featured ? 'text-emerald-700' : 'text-gray-500'
          }`}
        >
          {label}
        </span>
        {!isNeutral && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isPositive
                ? 'text-emerald-700 bg-emerald-100'
                : 'text-red-700 bg-red-100'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
        {isNeutral && (
          <span className="text-xs font-medium text-gray-400 px-2 py-1 rounded-full bg-gray-100">
            --
          </span>
        )}
      </div>
      <p
        className={`text-2xl font-bold tracking-tight ${
          featured ? 'text-emerald-900' : 'text-gray-900'
        }`}
        title={formatCurrencyDetailed(amount)}
      >
        {formatCurrency(amount)}
      </p>
      <p className="text-xs text-gray-400 mt-1">{period}</p>
    </div>
  )
}

function RevenueWidgetSkeleton() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gray-200 p-1.5 animate-pulse">
            <div className="h-4 w-4" />
          </div>
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RevenueWidgetError({
  error,
  onRetry,
}: {
  error: string | null
  onRetry: () => void
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-100 p-1.5">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Revenue</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-red-50 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            Unable to load revenue data
          </p>
          <p className="text-xs text-gray-400 mb-4 max-w-xs">
            {error || 'An unexpected error occurred'}
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </section>
  )
}

export default RevenueWidget
