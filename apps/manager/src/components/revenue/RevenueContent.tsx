'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MetricCard } from '@/components/ui/MetricCard'
import { cn, formatCurrency } from '@/lib/utils'

interface RevenueData {
  mrr: number
  previousMrr: number
  totalRevenue: number
  ordersToday: number
  avgOrderValue: number
  mrrTimeSeries: { date: string; mrr: number }[]
  revenueByTier: { tier: string; revenue: number; count: number; percentage: number }[]
  topSellers: {
    tenantId: string
    businessName: string
    totalRevenue: number
    orderCount: number
    avgOrderValue: number
    plan: string
  }[]
  revenueTimeSeries: { date: string; revenue: number; orderCount: number }[]
}

const TIER_COLORS: Record<string, string> = {
  free: 'hsl(215, 20%, 50%)',
  maker: 'hsl(142, 71%, 45%)',
  professional: 'hsl(217, 91%, 60%)',
  studio: 'hsl(280, 87%, 65%)',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground capitalize">
            {entry.dataKey}:
          </span>
          <span className="text-sm font-semibold text-foreground">
            {entry.dataKey === 'revenue' || entry.dataKey === 'mrr'
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function TierPieChart({ data }: { data: RevenueData['revenueByTier'] }) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No tier data available
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="tier"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={TIER_COLORS[entry.tier] || 'hsl(215, 20%, 50%)'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function DailyRevenueChart({ data }: { data: RevenueData['revenueTimeSeries'] }) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No revenue data available
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(217, 33%, 22%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
            tickMargin={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
            tickMargin={8}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill="hsl(217, 91%, 60%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TopSellersTable({ sellers, loading }: { sellers: RevenueData['topSellers']; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 skeleton rounded" />
        ))}
      </div>
    )
  }

  if (!sellers?.length) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No seller data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Seller
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Revenue
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Orders
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AOV
            </th>
            <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Plan
            </th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((seller, i) => (
            <tr
              key={seller.tenantId}
              className="border-b border-border/50 hover:bg-muted/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {seller.businessName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{seller.businessName}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                {formatCurrency(seller.totalRevenue)}
              </td>
              <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                {seller.orderCount}
              </td>
              <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                {formatCurrency(seller.avgOrderValue)}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize',
                    seller.plan === 'studio' && 'bg-violet-500/10 text-violet-400',
                    seller.plan === 'professional' && 'bg-blue-500/10 text-blue-400',
                    seller.plan === 'maker' && 'bg-emerald-500/10 text-emerald-400',
                    seller.plan === 'free' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {seller.plan}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RevenueContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<RevenueData>({
    mrr: 0,
    previousMrr: 0,
    totalRevenue: 0,
    ordersToday: 0,
    avgOrderValue: 0,
    mrrTimeSeries: [],
    revenueByTier: [],
    topSellers: [],
    revenueTimeSeries: [],
  })

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const res = await fetch('/api/revenue')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const mrrChange = data.previousMrr > 0
    ? ((data.mrr - data.previousMrr) / data.previousMrr) * 100
    : 0

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role,
              }
            : undefined
        }
      />

      <main className="ml-64 flex-1 p-8">
        <Header
          title="Revenue"
          subtitle="Platform revenue analytics and insights"
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
        />

        {/* Metrics Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={data.mrr}
            previousValue={data.previousMrr}
            format="currency"
            icon={<DollarSign className="h-6 w-6" />}
            loading={loading}
            accentColor="blue"
          />
          <MetricCard
            title="Total Platform Revenue"
            value={data.totalRevenue}
            format="currency"
            icon={<TrendingUp className="h-6 w-6" />}
            loading={loading}
            accentColor="green"
          />
          <MetricCard
            title="Orders Today"
            value={data.ordersToday}
            format="number"
            icon={<ShoppingCart className="h-6 w-6" />}
            loading={loading}
            accentColor="purple"
          />
          <MetricCard
            title="Avg Order Value"
            value={data.avgOrderValue}
            format="currency"
            icon={<Users className="h-6 w-6" />}
            loading={loading}
            accentColor="orange"
          />
        </div>

        {/* Charts Row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">MRR Trend</h3>
              <div className={cn(
                'flex items-center gap-1 text-sm',
                mrrChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {mrrChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{Math.abs(mrrChange).toFixed(1)}%</span>
              </div>
            </div>
            <RevenueChart data={data.mrrTimeSeries} loading={loading} />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Daily Revenue</h3>
              <span className="text-sm text-muted-foreground">Last 30 days</span>
            </div>
            <DailyRevenueChart data={data.revenueTimeSeries} />
          </div>
        </div>

        {/* Revenue by Tier + Top Sellers */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Revenue by Tier
            </h3>
            <TierPieChart data={data.revenueByTier} />
            <div className="mt-4 space-y-2">
              {data.revenueByTier.map((tier) => (
                <div key={tier.tier} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: TIER_COLORS[tier.tier] || 'hsl(215, 20%, 50%)' }}
                    />
                    <span className="capitalize text-muted-foreground">{tier.tier}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{tier.count} tenants</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(tier.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Top Sellers
            </h3>
            <TopSellersTable sellers={data.topSellers} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  )
}
