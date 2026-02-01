'use client'

import { useState } from 'react'
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp'
import { ShortcutsHint } from '@/components/ui/ShortcutsHint'
import { KeyboardShortcutsProvider } from '@/contexts/KeyboardShortcuts'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface MarketplaceConnections {
  ebay: boolean
  etsy: boolean
}

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
  }
  tenant: {
    id: string
    slug: string
    businessName: string
    plan?: string
  } | null
  marketplaceConnections?: MarketplaceConnections
}

export function DashboardShell({
  children,
  user,
  tenant,
  marketplaceConnections,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <KeyboardShortcutsProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          tenant={tenant}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          marketplaceConnections={marketplaceConnections}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            tenant={tenant}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6"
          >
            {children}
          </main>
          <ShortcutsHint />
        </div>
      </div>
      <ShortcutsHelp />
    </KeyboardShortcutsProvider>
  )
}
