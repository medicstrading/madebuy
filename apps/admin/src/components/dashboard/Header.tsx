'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User, ExternalLink, Search, Bell } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: {
    name: string
    email: string
  }
  tenant: {
    id: string
    slug: string
    businessName: string
  } | null
}

export function Header({ user, tenant }: HeaderProps) {
  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = tenant ? `${webBaseUrl}/${tenant.slug}` : null

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, orders..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* View Store Button */}
        {storefrontUrl && (
          <Link
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View Store
          </Link>
        )}

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <span className="text-sm font-semibold text-white">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block text-sm">
            <p className="font-medium text-gray-900">{user.name || user.email}</p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
