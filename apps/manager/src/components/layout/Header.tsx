'use client'

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  RefreshCw,
  ShoppingCart,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'signup' | 'order' | 'alert' | 'churn' | 'milestone'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
}

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  const config = {
    signup: { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    order: { icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    alert: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    churn: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    milestone: { icon: Trophy, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  }

  const { icon: Icon, color, bg } = config[type]

  return (
    <div className={cn('rounded-full p-2', bg)}>
      <Icon className={cn('h-4 w-4', color)} />
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function Header({
  title,
  subtitle,
  actions,
  onRefresh,
  refreshing,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markRead: true, id }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

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
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-3 p-4 transition-colors hover:bg-muted/50',
                          !notification.read && 'bg-primary/5',
                        )}
                      >
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            notification.read ? 'text-muted-foreground' : 'text-foreground font-medium',
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Custom actions */}
        {actions}
      </div>
    </header>
  )
}
