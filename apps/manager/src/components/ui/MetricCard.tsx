'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

interface MetricCardProps {
  title: string
  value: number
  previousValue?: number
  format?: 'currency' | 'number' | 'percentage'
  icon: React.ReactNode
  loading?: boolean
  subtitle?: string
  accentColor?: 'blue' | 'green' | 'purple' | 'orange'
}

const accentColors = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10',
    border: 'hover:border-blue-500/30',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    border: 'hover:border-emerald-500/30',
  },
  purple: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/10',
    border: 'hover:border-violet-500/30',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/10',
    border: 'hover:border-orange-500/30',
  },
}

export function MetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  icon,
  loading = false,
  subtitle,
  accentColor = 'blue',
}: MetricCardProps) {
  const colors = accentColors[accentColor]

  const formatValue = (v: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(v)
      case 'percentage':
        return formatPercentage(v)
      default:
        return formatNumber(v)
    }
  }

  const change =
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined

  const trend =
    change !== undefined
      ? change > 0
        ? 'up'
        : change < 0
          ? 'down'
          : 'neutral'
      : undefined

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-6',
        'transition-all duration-300 hover:shadow-lg',
        colors.border,
        colors.glow,
      )}
    >
      {/* Subtle gradient background on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          'bg-gradient-to-br from-transparent via-transparent to-white/[0.02]',
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-9 w-32 skeleton rounded" />
          ) : (
            <div className="mt-2">
              <AnimatedNumber
                value={value}
                formatFn={formatValue}
                className="text-3xl font-bold tracking-tight text-foreground"
              />
            </div>
          )}

          {change !== undefined && !loading && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend === 'up' && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    +{change.toFixed(1)}%
                  </span>
                </div>
              )}
              {trend === 'down' && (
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {change.toFixed(1)}%
                  </span>
                </div>
              )}
              {trend === 'neutral' && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm font-semibold">0%</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                vs last period
              </span>
            </div>
          )}

          {subtitle && (
            <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div
          className={cn(
            'rounded-xl p-3 transition-transform duration-300 group-hover:scale-110',
            colors.bg,
            colors.text,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
