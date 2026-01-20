'use client'

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Server,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Local types that match the API response
interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'critical'
  avgLatency?: number
  requestsPerMinute?: number
  successRate?: number
  errorsLast24h?: number
  cpuUsage?: number
  memoryUsage?: number
  diskUsage?: number
}

interface MongoStatsData {
  connections: number
  storageSize: number
  dataSize: number
  indexSize: number
  collections: { name: string; count: number; size: number }[]
}

interface SystemHealthCardProps {
  health?: SystemHealthData
  mongoStats?: MongoStatsData
  loading?: boolean
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

function StatusIndicator({
  status,
}: {
  status: 'healthy' | 'degraded' | 'critical'
}) {
  const config = {
    healthy: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Healthy',
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      label: 'Degraded',
    },
    critical: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Critical',
    },
  }

  const { icon: Icon, color, bg, border, label } = config[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1',
        bg,
        border,
      )}
    >
      <Icon className={cn('h-4 w-4', color)} />
      <span className={cn('text-sm font-medium', color)}>{label}</span>
    </div>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  subvalue,
  status,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subvalue?: string
  status?: 'good' | 'warning' | 'bad'
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {subvalue && (
            <p className="text-xs text-muted-foreground">{subvalue}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            status === 'good' && 'text-emerald-400',
            status === 'warning' && 'text-yellow-400',
            status === 'bad' && 'text-red-400',
            !status && 'text-foreground',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function ProgressBar({
  value,
  max,
  color = 'primary',
}: {
  value: number
  max: number
  color?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const percentage = Math.min((value / max) * 100, 100)

  const colors = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  }

  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          colors[color],
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function SystemHealthCard({
  health,
  mongoStats,
  loading = false,
}: SystemHealthCardProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="h-6 w-32 skeleton rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-10 skeleton rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const overallStatus = health?.status || 'healthy'

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Database Health */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Database className="h-5 w-5 text-violet-400" />
            </div>
            <h3 className="font-semibold text-foreground">Database</h3>
          </div>
          <StatusIndicator status={overallStatus} />
        </div>

        <div className="space-y-0">
          <StatRow
            icon={HardDrive}
            label="Storage"
            value={mongoStats ? formatBytes(mongoStats.storageSize) : '—'}
            subvalue={
              mongoStats
                ? `Data: ${formatBytes(mongoStats.dataSize)}`
                : undefined
            }
          />
          <StatRow
            icon={Server}
            label="Connections"
            value={mongoStats?.connections || 0}
            status={
              (mongoStats?.connections || 0) > 100
                ? 'warning'
                : (mongoStats?.connections || 0) > 50
                  ? 'good'
                  : undefined
            }
          />
          <StatRow
            icon={Activity}
            label="Collections"
            value={mongoStats?.collections?.length || 0}
          />
          <StatRow
            icon={Zap}
            label="Index Size"
            value={mongoStats ? formatBytes(mongoStats.indexSize) : '—'}
          />
        </div>
      </div>

      {/* API Health */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Server className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-foreground">API</h3>
          </div>
        </div>

        <div className="space-y-0">
          <StatRow
            icon={Clock}
            label="Avg Latency"
            value={health?.avgLatency ? formatMs(health.avgLatency) : '—'}
            status={
              (health?.avgLatency || 0) > 500
                ? 'bad'
                : (health?.avgLatency || 0) > 200
                  ? 'warning'
                  : 'good'
            }
          />
          <StatRow
            icon={Activity}
            label="Requests/min"
            value={health?.requestsPerMinute?.toLocaleString() || '—'}
          />
          <StatRow
            icon={CheckCircle}
            label="Success Rate"
            value={
              health?.successRate ? `${health.successRate.toFixed(1)}%` : '—'
            }
            status={
              (health?.successRate || 100) < 95
                ? 'bad'
                : (health?.successRate || 100) < 99
                  ? 'warning'
                  : 'good'
            }
          />
          <StatRow
            icon={AlertTriangle}
            label="Errors (24h)"
            value={health?.errorsLast24h || 0}
            status={
              (health?.errorsLast24h || 0) > 100
                ? 'bad'
                : (health?.errorsLast24h || 0) > 10
                  ? 'warning'
                  : undefined
            }
          />
        </div>
      </div>

      {/* Resource Usage */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Cpu className="h-5 w-5 text-orange-400" />
            </div>
            <h3 className="font-semibold text-foreground">Resources</h3>
          </div>
        </div>

        <div className="space-y-5">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">CPU</span>
              <span className="text-sm font-medium tabular-nums">
                {health?.cpuUsage?.toFixed(1) || 0}%
              </span>
            </div>
            <ProgressBar
              value={health?.cpuUsage || 0}
              max={100}
              color={
                (health?.cpuUsage || 0) > 80
                  ? 'danger'
                  : (health?.cpuUsage || 0) > 60
                    ? 'warning'
                    : 'success'
              }
            />
          </div>

          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className="text-sm font-medium tabular-nums">
                {health?.memoryUsage?.toFixed(1) || 0}%
              </span>
            </div>
            <ProgressBar
              value={health?.memoryUsage || 0}
              max={100}
              color={
                (health?.memoryUsage || 0) > 85
                  ? 'danger'
                  : (health?.memoryUsage || 0) > 70
                    ? 'warning'
                    : 'success'
              }
            />
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Disk</span>
              <span className="text-sm font-medium tabular-nums">
                {health?.diskUsage?.toFixed(1) || 0}%
              </span>
            </div>
            <ProgressBar
              value={health?.diskUsage || 0}
              max={100}
              color={
                (health?.diskUsage || 0) > 90
                  ? 'danger'
                  : (health?.diskUsage || 0) > 75
                    ? 'warning'
                    : 'success'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
