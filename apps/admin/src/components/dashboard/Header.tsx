'use client'

import { signOut } from 'next-auth/react'
import { LogOut, User, ExternalLink } from 'lucide-react'
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
  const storefrontUrl = tenant ? `http://localhost:3301/${tenant.slug}` : null

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {storefrontUrl && (
          <Link
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View My Store
          </Link>
        )}

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  )
}
