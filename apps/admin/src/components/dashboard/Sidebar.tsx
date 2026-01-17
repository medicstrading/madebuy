'use client'

import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Gift,
  Image,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Paintbrush,
  Percent,
  Plug,
  Receipt,
  Rocket,
  Settings,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  free: 'Starter Plan',
  maker: 'Maker Plan',
  professional: 'Professional Plan',
  studio: 'Studio Plan',
}

// Settings sub-items
const settingsSubItems = [
  {
    name: 'General',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Maker type & categories',
  },
  {
    name: 'Regional',
    href: '/dashboard/settings/regional',
    icon: MapPin,
    description: 'Currency & locale',
  },
  {
    name: 'Shipping',
    href: '/dashboard/settings/shipping',
    icon: Truck,
    description: 'Sendle integration',
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    icon: Receipt,
    description: 'Plans & invoices',
  },
  {
    name: 'Tax / GST',
    href: '/dashboard/settings/tax',
    icon: Percent,
    description: 'Tax settings',
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    description: 'Email preferences',
  },
  {
    name: 'AI Captions',
    href: '/dashboard/settings/caption-style',
    icon: Sparkles,
    description: 'Caption style',
  },
  {
    name: 'Import',
    href: '/dashboard/settings/import',
    icon: Upload,
    description: 'Bulk CSV import',
  },
]

const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Quick Launch', href: '/dashboard/wizard', icon: Rocket },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
      { name: 'Bundles', href: '/dashboard/bundles', icon: Gift },
      { name: 'Media', href: '/dashboard/media', icon: Image },
      { name: 'Materials', href: '/dashboard/materials', icon: Layers },
    ],
  },
  {
    label: 'Sales',
    items: [
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { name: 'Customers', href: '/dashboard/customers', icon: Users },
      { name: 'Reports', href: '/dashboard/reports', icon: Receipt },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        name: 'Website Design',
        href: '/dashboard/website-design',
        icon: Paintbrush,
      },
      { name: 'Content', href: '/dashboard/content', icon: Share2 },
      { name: 'Discounts', href: '/dashboard/discounts', icon: Tag },
    ],
  },
]

export function Sidebar({
  tenant,
  isOpen,
  onClose,
  marketplaceConnections,
}: SidebarProps) {
  const pathname = usePathname()

  // Settings expansion state - auto-expand if on a settings page
  const isOnSettingsPage = pathname?.startsWith('/dashboard/settings')
  const [settingsExpanded, setSettingsExpanded] = useState(
    isOnSettingsPage || false,
  )

  // Update expansion when pathname changes
  useEffect(() => {
    if (isOnSettingsPage) {
      setSettingsExpanded(true)
    }
  }, [isOnSettingsPage])

  const hasEbay = marketplaceConnections?.ebay
  const hasEtsy = marketplaceConnections?.etsy

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-6 border-b border-gray-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={onClose}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">MadeBuy</span>
        </Link>
        {onClose && (
          <button
            type="button"
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
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-6')}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`)
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
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive
                          ? 'text-blue-600'
                          : 'text-gray-400 group-hover:text-gray-600',
                      )}
                    />
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

        {/* Marketplaces Section */}
        <div className="mt-6">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Marketplaces
          </h3>
          <div className="space-y-1">
            <Link
              href="/dashboard/marketplace/etsy"
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                pathname === '/dashboard/marketplace/etsy'
                  ? 'bg-blue-50 text-blue-600'
                  : hasEtsy
                    ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded',
                  hasEtsy ? 'bg-orange-100' : 'bg-gray-100',
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill={hasEtsy ? '#F56400' : '#9CA3AF'}
                >
                  <path d="M8.559 3.891H4.729v7.618h3.652v1.176H4.729v7.437h4.013c.551 0 1.006-.181 1.365-.545.358-.363.538-.804.538-1.324v-.363h1.176v1.544c0 .803-.272 1.486-.816 2.048-.544.562-1.21.844-1.997.844H3.552V2.345h5.372c.787 0 1.453.282 1.997.845.544.562.816 1.244.816 2.047v1.545H10.56v-.363c0-.52-.18-.962-.538-1.324-.359-.364-.814-.545-1.365-.545h-.098v-.659z" />
                </svg>
              </span>
              <span className="flex-1">Etsy</span>
              {!hasEtsy && (
                <span className="text-xs text-gray-400">Connect</span>
              )}
            </Link>
            <Link
              href="/dashboard/marketplace/ebay"
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                pathname === '/dashboard/marketplace/ebay'
                  ? 'bg-blue-50 text-blue-600'
                  : hasEbay
                    ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded',
                  hasEbay ? 'bg-blue-50' : 'bg-gray-100',
                )}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <text
                    x="1"
                    y="17"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="Arial, sans-serif"
                  >
                    <tspan fill={hasEbay ? '#E53238' : '#9CA3AF'}>e</tspan>
                    <tspan fill={hasEbay ? '#0064D2' : '#9CA3AF'}>b</tspan>
                    <tspan fill={hasEbay ? '#F5AF02' : '#9CA3AF'}>a</tspan>
                    <tspan fill={hasEbay ? '#86B817' : '#9CA3AF'}>y</tspan>
                  </text>
                </svg>
              </span>
              <span className="flex-1">eBay</span>
              {!hasEbay && (
                <span className="text-xs text-gray-400">Connect</span>
              )}
            </Link>
          </div>
        </div>

        {/* Settings Section - Expandable */}
        <div className="mt-6">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Settings
          </h3>
          <div className="space-y-1">
            {/* Connections */}
            <Link
              href="/dashboard/connections"
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                pathname === '/dashboard/connections'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Plug
                className={cn(
                  'h-5 w-5 transition-colors',
                  pathname === '/dashboard/connections'
                    ? 'text-blue-600'
                    : 'text-gray-400 group-hover:text-gray-600',
                )}
              />
              <span className="flex-1">Connections</span>
            </Link>

            {/* Settings - Expandable */}
            <div>
              <button
                type="button"
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isOnSettingsPage
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Settings
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isOnSettingsPage
                      ? 'text-blue-600'
                      : 'text-gray-400 group-hover:text-gray-600',
                  )}
                />
                <span className="flex-1 text-left">Settings</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    settingsExpanded ? 'rotate-180' : '',
                    isOnSettingsPage ? 'text-blue-400' : 'text-gray-400',
                  )}
                />
              </button>

              {/* Settings Sub-items */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  settingsExpanded
                    ? 'max-h-[500px] opacity-100'
                    : 'max-h-0 opacity-0',
                )}
              >
                <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3">
                  {settingsSubItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                          isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-colors flex-shrink-0',
                            isActive
                              ? 'text-blue-600'
                              : 'text-gray-400 group-hover:text-gray-600',
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
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
              {planLabels[tenant?.plan || 'free'] || 'Starter Plan'}
            </p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-[260px] flex-col bg-white border-r border-gray-200">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - overlay */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-xl">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
