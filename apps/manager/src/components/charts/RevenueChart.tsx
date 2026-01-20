'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueDataPoint {
  date: string
  mrr: number
  newMrr?: number
  churned?: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
  loading?: boolean
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
            {entry.dataKey === 'mrr' ? 'MRR' : entry.dataKey}:
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="space-y-3 w-full">
          <div className="h-4 skeleton rounded w-1/4" />
          <div className="h-56 skeleton rounded" />
        </div>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">
        <p>No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(217, 91%, 60%)"
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor="hsl(217, 91%, 60%)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tickMargin={8}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fill="url(#mrrGradient)"
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
