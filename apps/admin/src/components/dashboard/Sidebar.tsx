'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Image,
  Layers,
  ShoppingCart,
  Tag,
  Share2,
  FileText,
  Mail,
  Plug,
  Settings,
  Store,
  Paintbrush
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
  { name: 'Website Design', href: '/dashboard/website-design', icon: Paintbrush },
  { name: 'Media', href: '/dashboard/media', icon: Image },
  { name: 'Materials', href: '/dashboard/materials', icon: Layers },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Promotions', href: '/dashboard/promotions', icon: Tag },
  { name: 'Publish', href: '/dashboard/publish', icon: Share2 },
  { name: 'Blog', href: '/dashboard/blog', icon: FileText },
  { name: 'Enquiries', href: '/dashboard/enquiries', icon: Mail },
  { name: 'Connections', href: '/dashboard/connections', icon: Plug },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">MadeBuy</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
