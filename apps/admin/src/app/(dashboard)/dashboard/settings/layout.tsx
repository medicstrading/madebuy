'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings,
  CreditCard,
  Truck,
  Globe,
  Calculator,
  Receipt,
  Percent,
  Bell,
  Sparkles,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsLayoutProps {
  children: React.ReactNode
}

const settingsNavItems = [
  {
    name: 'General',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Maker type and categories',
  },
  {
    name: 'Payments',
    href: '/dashboard/settings/payments',
    icon: CreditCard,
    description: 'Stripe Connect setup',
  },
  {
    name: 'Marketplaces',
    href: '/dashboard/settings/marketplace',
    icon: Store,
    description: 'eBay & Etsy connections',
  },
  {
    name: 'Shipping',
    href: '/dashboard/settings/shipping',
    icon: Truck,
    description: 'Sendle integration',
  },
  {
    name: 'Domain',
    href: '/dashboard/settings/domain',
    icon: Globe,
    description: 'Custom domain setup',
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    icon: Receipt,
    description: 'Subscription and invoices',
  },
  {
    name: 'Accounting',
    href: '/dashboard/settings/accounting',
    icon: Calculator,
    description: 'Xero/MYOB connection',
  },
  {
    name: 'Tax / GST',
    href: '/dashboard/settings/tax',
    icon: Percent,
    description: 'GST registration and rates',
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    description: 'Email notification preferences',
  },
  {
    name: 'Caption Style',
    href: '/dashboard/settings/caption-style',
    icon: Sparkles,
    description: 'AI caption preferences',
  },
]

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Settings Navigation Sidebar */}
      <div className="lg:w-64 shrink-0">
        <nav className="space-y-1">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p
                    className={cn(
                      'text-xs truncate',
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
