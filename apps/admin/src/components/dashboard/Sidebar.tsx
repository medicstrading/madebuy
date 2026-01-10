'use client'

import { useState } from 'react'
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
  ChevronDown,
  Tag,
  Newspaper,
  FolderOpen,
  Calendar,
  X,
  Users,
  BookOpen,
  Star,
  BarChart3,
  Gift,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketplaceConnections {
  ebay: boolean
  etsy: boolean
}

interface SidebarProps {
  tenant?: {
    storeName?: string
    businessName?: string
    plan?: string
  } | null
  isOpen?: boolean
  onClose?: () => void
  marketplaceConnections?: MarketplaceConnections
}

const planLabels: Record<string, string> = {
  starter: 'Starter Plan',
  maker: 'Maker Plan',
  professional: 'Professional Plan',
  studio: 'Studio Plan',
}

const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'Products',
    items: [
      { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
      { name: 'Bundles', href: '/dashboard/bundles', icon: Gift },
      { name: 'Media', href: '/dashboard/media', icon: Image },
      { name: 'Materials', href: '/dashboard/materials', icon: Layers },
    ]
  },
  {
    label: 'Sales',
    items: [
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { name: 'Ledger', href: '/dashboard/ledger', icon: BookOpen },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
      { name: 'Customers', href: '/dashboard/customers', icon: Users },
      { name: 'Discounts', href: '/dashboard/discounts', icon: Tag },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Website Design', href: '/dashboard/website-design', icon: Paintbrush },
      { name: 'Collections', href: '/dashboard/collections', icon: FolderOpen },
      { name: 'Publish', href: '/dashboard/publish', icon: Share2 },
      { name: 'Blog', href: '/dashboard/blog', icon: FileText },
      { name: 'Newsletters', href: '/dashboard/newsletters', icon: Newspaper },
    ]
  },
  {
    label: 'System',
    items: [
      { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
      { name: 'Enquiries', href: '/dashboard/enquiries', icon: Mail },
      { name: 'Connections', href: '/dashboard/connections', icon: Plug },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]
  }
]

export function Sidebar({ tenant, isOpen, onClose, marketplaceConnections }: SidebarProps) {
  const pathname = usePathname()
  const [marketplaceExpanded, setMarketplaceExpanded] = useState(
    pathname?.startsWith('/dashboard/marketplace') || false
  )

  const hasAnyMarketplace = marketplaceConnections?.ebay || marketplaceConnections?.etsy

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">MadeBuy</span>
        </Link>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {/* Insert Marketplace before System group */}
            {group.label === 'System' && hasAnyMarketplace && (
              <div className="mt-6">
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Marketplace
                </h3>
                <div className="space-y-1">
                  {/* Expandable Marketplace parent */}
                  <button
                    onClick={() => setMarketplaceExpanded(!marketplaceExpanded)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      pathname?.startsWith('/dashboard/marketplace')
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Store className={cn(
                      'h-5 w-5 transition-colors',
                      pathname?.startsWith('/dashboard/marketplace') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span className="flex-1 text-left">Marketplaces</span>
                    <ChevronDown className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      marketplaceExpanded ? 'rotate-180' : ''
                    )} />
                  </button>

                  {/* Marketplace sub-items */}
                  {marketplaceExpanded && (
                    <div className="ml-4 space-y-1 border-l border-gray-200 pl-3">
                      {marketplaceConnections?.ebay && (
                        <Link
                          href="/dashboard/marketplace/ebay"
                          onClick={onClose}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                            pathname === '/dashboard/marketplace/ebay'
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600">e</span>
                          <span>eBay</span>
                        </Link>
                      )}
                      {marketplaceConnections?.etsy && (
                        <Link
                          href="/dashboard/marketplace/etsy"
                          onClick={onClose}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                            pathname === '/dashboard/marketplace/etsy'
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-100 text-xs font-bold text-orange-600">E</span>
                          <span>Etsy</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={cn(groupIndex > 0 && 'mt-6')}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
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
                      onClick={onClose}
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
    </>
  )

  // Desktop sidebar
  return (
    <>
      {/* Desktop sidebar - always visible on lg+ */}
      <div className="hidden lg:flex h-full w-[260px] flex-col bg-white border-r border-gray-200">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          {/* Sidebar */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-xl">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
