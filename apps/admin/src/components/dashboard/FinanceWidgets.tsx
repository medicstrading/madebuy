'use client'

import { useState, useEffect } from 'react'
import { DollarSign, ArrowUpRight, Clock, TrendingUp, TrendingDown, CreditCard, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface LedgerSummary {
  todaySales: {
    gross: number
    net: number
    count: number
  }
  pendingPayout: {
    amount: number
    inTransit: number
    nextDate: string | null
  }
  thisMonth: {
    gross: number
    net: number
    count: number
    fees: number
    refunds: number
  }
  lastMonth: {
    gross: number
    net: number
    count: number
  }
  monthChange: number
  feesYTD: number
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`
  }
  return formatCurrency(cents)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateString))
}

export function FinanceWidgets() {
  const [data, setData] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await fetch('/api/ledger/summary')
        if (!response.ok) {
          throw new Error('Failed to fetch summary')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Finances</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Finances</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            Unable to load financial data
          </div>
        </div>
      </section>
    )
  }

  const isPositiveChange = data.monthChange >= 0

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-base font-semibold text-gray-900">Finances</h2>
        <Link
          href="/dashboard/ledger"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          View Ledger
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today's Sales */}
          <FinanceCard
            title="Today's Sales"
            value={formatCurrency(data.todaySales.net)}
            subtitle={`${data.todaySales.count} order${data.todaySales.count !== 1 ? 's' : ''}`}
            icon={DollarSign}
            color="green"
          />

          {/* Pending Payout */}
          <FinanceCard
            title="Pending Payout"
            value={formatCurrency(data.pendingPayout.amount + data.pendingPayout.inTransit)}
            subtitle={data.pendingPayout.nextDate ? `Est. ${formatDate(data.pendingPayout.nextDate)}` : 'No pending payouts'}
            icon={Clock}
            color="blue"
            badge={data.pendingPayout.inTransit > 0 ? `${formatCurrencyCompact(data.pendingPayout.inTransit)} in transit` : undefined}
          />

          {/* This Month */}
          <FinanceCard
            title="This Month"
            value={formatCurrency(data.thisMonth.net)}
            subtitle={`${data.thisMonth.count} sale${data.thisMonth.count !== 1 ? 's' : ''}`}
            icon={isPositiveChange ? TrendingUp : TrendingDown}
            color={isPositiveChange ? 'emerald' : 'red'}
            trend={data.monthChange}
            trendLabel="vs last month"
          />

          {/* Fees YTD */}
          <FinanceCard
            title="Fees (YTD)"
            value={formatCurrency(data.feesYTD)}
            subtitle="Stripe processing fees"
            icon={CreditCard}
            color="gray"
          />
        </div>
      </div>
    </section>
  )
}

function FinanceCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendLabel,
  badge,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: 'green' | 'blue' | 'emerald' | 'red' | 'gray' | 'amber'
  trend?: number
  trendLabel?: string
  badge?: string
}) {
  const colorClasses = {
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    red: 'bg-red-500 text-white',
    gray: 'bg-gray-500 text-white',
    amber: 'bg-amber-500 text-white',
  }

  const isPositive = (trend ?? 0) >= 0

  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-5 transition-all hover:shadow-md hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 shadow-sm ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
            }`}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
        {badge && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-1 font-medium">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        {trendLabel && trend !== undefined && (
          <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  )
}

export default FinanceWidgets
