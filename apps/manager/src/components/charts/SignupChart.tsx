'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface SignupDataPoint {
  date: string
  signups: number
  churned?: number
}

interface SignupChartProps {
  data: SignupDataPoint[]
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
            {entry.dataKey}:
          </span>
          <span className="text-sm font-semibold text-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SignupChart({ data, loading = false }: SignupChartProps) {
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
        <p>No signup data available</p>
      </div>
    )
  }

  // Find max value for dynamic coloring
  const maxSignups = Math.max(...data.map((d) => d.signups))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(142, 71%, 45%)"
                stopOpacity={1}
              />
              <stop
                offset="100%"
                stopColor="hsl(142, 71%, 35%)"
                stopOpacity={0.8}
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
            tickMargin={8}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'hsl(217, 33%, 17%)', opacity: 0.5 }}
          />
          <Bar
            dataKey="signups"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.signups === maxSignups
                    ? 'hsl(142, 71%, 50%)'
                    : 'hsl(142, 71%, 40%)'
                }
                opacity={0.6 + (entry.signups / maxSignups) * 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
