'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { KeyboardShortcutsProvider } from '@/contexts/KeyboardShortcuts'
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp'
import { ShortcutsHint } from '@/components/ui/ShortcutsHint'

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
}

export function DashboardShell({ children, user, tenant }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <KeyboardShortcutsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          tenant={tenant}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            tenant={tenant}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
            {children}
          </main>
          <ShortcutsHint />
        </div>
      </div>
      <ShortcutsHelp />
    </KeyboardShortcutsProvider>
  )
}
