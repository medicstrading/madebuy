'use client'

import { Bell, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}

export function Header({
  title,
  subtitle,
  actions,
  onRefresh,
  refreshing,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat('en-AU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-30 mb-8 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm -mx-8 px-8 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Time */}
        <span className="hidden md:block text-sm text-muted-foreground tabular-nums">
          {currentTime}
        </span>

        {/* Refresh */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              'rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              refreshing && 'pointer-events-none',
            )}
            title="Refresh data"
          >
            <RefreshCw
              className={cn('h-5 w-5', refreshing && 'animate-spin')}
            />
          </button>
        )}

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* Custom actions */}
        {actions}
      </div>
    </header>
  )
}
