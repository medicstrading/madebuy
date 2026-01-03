'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Image,
  Layers,
  ShoppingCart,
  Share2,
  FileText,
  Mail,
  Plug,
  Settings,
  Paintbrush,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  tenant?: {
    storeName?: string
    businessName?: string
    plan?: string
  } | null
}

const planLabels: Record<string, string> = {
  free: 'Free Plan',
  maker: 'Maker Plan',
  pro: 'Pro Plan',
  business: 'Business Plan',
}

const navigationGroups = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { name: 'Media', href: '/dashboard/media', icon: Image },
      { name: 'Materials', href: '/dashboard/materials', icon: Layers },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Website Design', href: '/dashboard/website-design', icon: Paintbrush },
      { name: 'Publish', href: '/dashboard/publish', icon: Share2 },
      { name: 'Blog', href: '/dashboard/blog', icon: FileText },
    ]
  },
  {
    label: 'Support',
    items: [
      { name: 'Enquiries', href: '/dashboard/enquiries', icon: Mail },
      { name: 'Connections', href: '/dashboard/connections', icon: Plug },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]
  }
]

export function Sidebar({ tenant }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[280px] flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">MadeBuy</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-8')}>
            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-blue-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card at bottom */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <span className="text-sm font-semibold text-white">
              {(tenant?.businessName || 'MB').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {tenant?.businessName || 'My Store'}
            </p>
            <p className="text-xs text-gray-500">
              {planLabels[tenant?.plan || 'free'] || 'Free Plan'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
