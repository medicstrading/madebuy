'use client'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { SignupChart } from '@/components/charts/SignupChart'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MetricCard } from '@/components/ui/MetricCard'
import { SystemHealthCard } from '@/components/ui/SystemHealthCard'
import { cn } from '@/lib/utils'

interface DashboardData {
  mrr: number
  previousMrr: number
  activeTenants: number
  previousActiveTenants: number
  ordersToday: number
  revenueToday: number
  systemStatus: 'healthy' | 'degraded' | 'critical'
  mrrTimeSeries: { date: string; mrr: number }[]
  signupTimeSeries: { date: string; signups: number }[]
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical'
    avgLatency?: number
    requestsPerMinute?: number
    successRate?: number
    errorsLast24h?: number
    cpuUsage?: number
    memoryUsage?: number
    diskUsage?: number
  }
  mongoStats: {
    connections: number
    storageSize: number
    dataSize: number
    indexSize: number
    collections: { name: string; count: number; size: number }[]
  }
}

function StatusBadge({
  status,
}: {
  status: 'healthy' | 'degraded' | 'critical'
}) {
  const config = {
    healthy: {
      icon: CheckCircle,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      label: 'All Systems Operational',
    },
    degraded: {
      icon: AlertCircle,
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/20',
      label: 'Degraded Performance',
    },
    critical: {
      icon: AlertCircle,
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      label: 'System Issues',
    },
  }

  const { icon: Icon, bg, text, border, label } = config[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-4 py-1.5',
        bg,
        border,
      )}
    >
      <Icon className={cn('h-4 w-4', text)} />
      <span className={cn('text-sm font-medium', text)}>{label}</span>
    </div>
  )
}

function RecentActivity({ loading }: { loading: boolean }) {
  // Placeholder for now - will be populated from audit logs
  const activities = [
    {
      type: 'signup',
      message: 'New tenant signup: Handmade Haven',
      time: '2 hours ago',
    },
    {
      type: 'order',
      message: 'Order #1234 completed on Crystal Crafts',
      time: '3 hours ago',
    },
    {
      type: 'alert',
      message: 'High traffic detected on Web app',
      time: '5 hours ago',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 skeleton rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton w-2/3 rounded" />
              <div className="h-3 skeleton w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <Clock className="mx-auto h-8 w-8 opacity-20" />
          <p className="mt-2">No recent activity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, i) => (
        <div
          key={i}
          className="flex items-start gap-4 animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              activity.type === 'signup' &&
                'bg-emerald-500/10 text-emerald-400',
              activity.type === 'order' && 'bg-blue-500/10 text-blue-400',
              activity.type === 'alert' && 'bg-yellow-500/10 text-yellow-400',
            )}
          >
            {activity.type === 'signup' && <Users className="h-5 w-5" />}
            {activity.type === 'order' && <ShoppingCart className="h-5 w-5" />}
            {activity.type === 'alert' && <AlertCircle className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">{activity.message}</p>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<DashboardData>({
    mrr: 0,
    previousMrr: 0,
    activeTenants: 0,
    previousActiveTenants: 0,
    ordersToday: 0,
    revenueToday: 0,
    systemStatus: 'healthy',
    mrrTimeSeries: [],
    signupTimeSeries: [],
    systemHealth: {
      status: 'healthy',
    },
    mongoStats: {
      connections: 0,
      storageSize: 0,
      dataSize: 0,
      indexSize: 0,
      collections: [],
    },
  })

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

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
          title="Dashboard"
          subtitle="Platform overview and key metrics"
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          actions={<StatusBadge status={data.systemStatus} />}
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
            title="Active Tenants"
            value={data.activeTenants}
            previousValue={data.previousActiveTenants}
            format="number"
            icon={<Users className="h-6 w-6" />}
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
            title="Revenue Today"
            value={data.revenueToday}
            format="currency"
            icon={<Package className="h-6 w-6" />}
            loading={loading}
            accentColor="orange"
          />
        </div>

        {/* Charts Row */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                MRR Trend
              </h3>
              <div className="flex items-center gap-1 text-sm text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span>12 months</span>
              </div>
            </div>
            <RevenueChart data={data.mrrTimeSeries} loading={loading} />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                New Signups
              </h3>
              <span className="text-sm text-muted-foreground">
                Last 30 days
              </span>
            </div>
            <SignupChart data={data.signupTimeSeries} loading={loading} />
          </div>
        </div>

        {/* System Health */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            System Health
          </h3>
          <SystemHealthCard
            health={data.systemHealth}
            mongoStats={data.mongoStats}
            loading={loading}
          />
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Recent Activity
          </h3>
          <RecentActivity loading={loading} />
        </div>
      </main>
    </div>
  )
}
