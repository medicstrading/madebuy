'use client'

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
  Zap,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'

interface SystemData {
  status: 'healthy' | 'degraded' | 'critical'
  services: {
    name: string
    status: 'online' | 'degraded' | 'offline'
    latency?: number
    lastCheck: string
    uptime?: number
  }[]
  metrics: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIn: number
    networkOut: number
  }
  database: {
    status: 'healthy' | 'degraded' | 'critical'
    connections: number
    maxConnections: number
    storageSize: number
    dataSize: number
    indexSize: number
    avgQueryTime: number
    slowQueries: number
    collections: { name: string; count: number; size: number }[]
  }
  api: {
    requestsPerMinute: number
    avgLatency: number
    successRate: number
    errorsLast24h: number
    endpoints: {
      path: string
      method: string
      avgLatency: number
      errorRate: number
    }[]
  }
  recentErrors: {
    timestamp: string
    service: string
    message: string
    count: number
  }[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatUptime(seconds?: number): string {
  if (!seconds) return 'N/A'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function StatusBadge({
  status,
}: {
  status: 'healthy' | 'degraded' | 'critical' | 'online' | 'offline'
}) {
  const config = {
    healthy: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      label: 'Healthy',
    },
    online: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      label: 'Online',
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      label: 'Degraded',
    },
    critical: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Critical',
    },
    offline: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Offline',
    },
  }

  const { icon: Icon, color, bg, label } = config[status]

  return (
    <div className={cn('flex items-center gap-2 rounded-full px-3 py-1', bg)}>
      <Icon className={cn('h-4 w-4', color)} />
      <span className={cn('text-sm font-medium', color)}>{label}</span>
    </div>
  )
}

function ProgressBar({
  value,
  max = 100,
  color = 'primary',
}: {
  value: number
  max?: number
  color?: string
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const colorClass =
    percentage > 80
      ? 'bg-red-500'
      : percentage > 60
        ? 'bg-yellow-500'
        : 'bg-emerald-500'

  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          colorClass,
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function ServiceCard({ service }: { service: SystemData['services'][0] }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 hover:bg-card transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              service.status === 'online'
                ? 'bg-emerald-500/10'
                : 'bg-red-500/10',
            )}
          >
            <Server
              className={cn(
                'h-5 w-5',
                service.status === 'online'
                  ? 'text-emerald-400'
                  : 'text-red-400',
              )}
            />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{service.name}</h4>
            <p className="text-xs text-muted-foreground">
              Last check: {new Date(service.lastCheck).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Latency</p>
          <p className="font-semibold text-foreground tabular-nums">
            {service.latency ? formatMs(service.latency) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Uptime</p>
          <p className="font-semibold text-foreground tabular-nums">
            {formatUptime(service.uptime)}
          </p>
        </div>
      </div>
    </div>
  )
}

function MetricGauge({
  label,
  value,
  max = 100,
  icon: Icon,
}: {
  label: string
  value: number
  max?: number
  icon: any
}) {
  const percentage = (value / max) * 100
  const status =
    percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'good'

  return (
    <div className="text-center">
      <div className="relative mx-auto h-24 w-24 mb-3">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(217, 33%, 22%)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={
              status === 'critical'
                ? 'hsl(0, 84%, 60%)'
                : status === 'warning'
                  ? 'hsl(45, 93%, 47%)'
                  : 'hsl(142, 71%, 45%)'
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground mb-1" />
          <span className="text-lg font-bold text-foreground tabular-nums">
            {value.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function SystemContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<SystemData>({
    status: 'healthy',
    services: [],
    metrics: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
    },
    database: {
      status: 'healthy',
      connections: 0,
      maxConnections: 100,
      storageSize: 0,
      dataSize: 0,
      indexSize: 0,
      avgQueryTime: 0,
      slowQueries: 0,
      collections: [],
    },
    api: {
      requestsPerMinute: 0,
      avgLatency: 0,
      successRate: 100,
      errorsLast24h: 0,
      endpoints: [],
    },
    recentErrors: [],
  })

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const res = await fetch('/api/system')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 30 * 1000) // Refresh every 30s
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
          title="System Health"
          subtitle="Monitor platform infrastructure and services"
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          actions={<StatusBadge status={data.status} />}
        />

        {/* Resource Usage Gauges */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-foreground">
            Resource Usage
          </h3>
          <div className="grid grid-cols-3 gap-8">
            <MetricGauge label="CPU" value={data.metrics.cpuUsage} icon={Cpu} />
            <MetricGauge
              label="Memory"
              value={data.metrics.memoryUsage}
              icon={Activity}
            />
            <MetricGauge
              label="Disk"
              value={data.metrics.diskUsage}
              icon={HardDrive}
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Services
          </h3>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 skeleton rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.services.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          )}
        </div>

        {/* Database & API Stats */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Database */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <Database className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-foreground">Database</h3>
              </div>
              <StatusBadge status={data.database.status} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Connections
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {data.database.connections} / {data.database.maxConnections}
                  </span>
                </div>
                <ProgressBar
                  value={data.database.connections}
                  max={data.database.maxConnections}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Storage</p>
                  <p className="font-semibold text-foreground">
                    {formatBytes(data.database.storageSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Data Size
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatBytes(data.database.dataSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Index Size
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatBytes(data.database.indexSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Avg Query Time
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatMs(data.database.avgQueryTime)}
                  </p>
                </div>
              </div>

              {data.database.slowQueries > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    {data.database.slowQueries} slow queries detected
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* API Health */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground">API</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Requests/min
                </p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {data.api.requestsPerMinute.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Avg Latency
                </p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {formatMs(data.api.avgLatency)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Success Rate
                </p>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    data.api.successRate >= 99
                      ? 'text-emerald-400'
                      : data.api.successRate >= 95
                        ? 'text-yellow-400'
                        : 'text-red-400',
                  )}
                >
                  {data.api.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Errors (24h)
                </p>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    data.api.errorsLast24h === 0
                      ? 'text-foreground'
                      : data.api.errorsLast24h < 10
                        ? 'text-yellow-400'
                        : 'text-red-400',
                  )}
                >
                  {data.api.errorsLast24h}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        {data.recentErrors.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="font-semibold text-foreground">Recent Errors</h3>
            </div>
            <div className="space-y-3">
              {data.recentErrors.map((error, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-red-400 uppercase">
                        {error.service}
                      </span>
                      {error.count > 1 && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                          x{error.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{error.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
