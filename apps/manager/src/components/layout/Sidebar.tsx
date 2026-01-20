'use client'

import {
  Activity,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/system', label: 'System', icon: Server },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user?: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="relative flex h-9 w-9 items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-violet-600 opacity-80" />
          <div className="absolute inset-[2px] rounded-[10px] bg-card" />
          <Activity className="relative h-5 w-5 text-primary" />
        </div>
        <div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            Manager
          </span>
          <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platform
        </p>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive && 'scale-110',
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        {user && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80 text-xs font-bold text-white">
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.role || 'owner'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
