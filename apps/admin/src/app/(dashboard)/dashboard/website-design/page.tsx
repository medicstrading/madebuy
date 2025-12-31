'use client'

import { useState, useEffect } from 'react'
import { ColorsTabWithPreview } from '@/components/website-design/ColorsTabWithPreview'
import { TypographyTabWithPreview } from '@/components/website-design/TypographyTabWithPreview'
import { BannerTabWithPreview } from '@/components/website-design/BannerTabWithPreview'
import { LayoutTabWithPreview } from '@/components/website-design/LayoutTabWithPreview'
import { LayoutContentTab } from '@/components/website-design/LayoutContentTab'
import { LogoUploadTab } from '@/components/website-design/LogoUploadTab'
import { BlogSettingsTab } from '@/components/website-design/BlogSettingsTab'
import {
  Paintbrush,
  Type,
  Layout,
  Image as ImageIcon,
  Sparkles,
  FileText,
  BookOpen,
  Crown,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabValue = 'colors' | 'logo' | 'banner' | 'typography' | 'layout' | 'content' | 'blog'

interface NavItem {
  value: TabValue
  label: string
  icon: any
  isPro?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Brand Identity',
    items: [
      { value: 'logo', label: 'Store Logo', icon: Sparkles },
      { value: 'colors', label: 'Brand Colors', icon: Paintbrush },
      { value: 'typography', label: 'Font Style', icon: Type },
    ]
  },
  {
    label: 'Homepage',
    items: [
      { value: 'layout', label: 'Layout Template', icon: Layout, isPro: true },
      { value: 'banner', label: 'Hero Banner', icon: ImageIcon, isPro: true },
      { value: 'content', label: 'Section Content', icon: FileText },
    ]
  },
  {
    label: 'Extras',
    items: [
      { value: 'blog', label: 'Blog Settings', icon: BookOpen },
    ]
  }
]

const tabTitles: Record<TabValue, { title: string; description: string }> = {
  colors: { title: 'Brand Colors', description: 'Choose your primary and accent colors' },
  logo: { title: 'Store Logo', description: 'Upload and manage your store logo' },
  banner: { title: 'Hero Banner', description: 'Customize your storefront banner' },
  typography: { title: 'Font Style', description: 'Select typography for your store' },
  layout: { title: 'Layout Template', description: 'Choose how products are displayed' },
  content: { title: 'Section Content', description: 'Edit your storefront sections' },
  blog: { title: 'Blog Settings', description: 'Configure your blog and articles' },
}

export default function WebsiteDesignPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('logo')
  const [tenantSlug, setTenantSlug] = useState<string>('')
  const currentTab = tabTitles[activeTab]

  useEffect(() => {
    // Fetch tenant info to get the slug for preview link
    fetch('/api/tenant')
      .then(res => res.json())
      .then(data => {
        if (data.slug) {
          setTenantSlug(data.slug)
        }
      })
      .catch(console.error)
  }, [])

  // Construct the storefront URL - use web app port in development
  const storefrontUrl = tenantSlug
    ? (process.env.NODE_ENV === 'development'
        ? `http://localhost:3301/${tenantSlug}`
        : `/${tenantSlug}`)
    : '#'

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Left Sidebar Navigation */}
      <div className="w-56 flex-shrink-0">
        <div className="sticky top-6 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.value

                  return (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      )} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.isPro && (
                        <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Crown className="h-3 w-3" />
                          Pro
                        </span>
                      )}
                      {isActive && !item.isPro && (
                        <ChevronRight className="h-4 w-4 text-blue-400" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}

          {/* Save Progress Indicator */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Auto-saved</span>
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
            </div>
            <p className="text-xs text-gray-500">Changes save automatically</p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="flex-1 min-w-0">
        {/* Content Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{currentTab.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{currentTab.description}</p>
          </div>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            Preview Store
          </a>
        </div>

        {/* Tab Content - Each tab handles its own preview */}
        <div className="rounded-xl bg-white border border-gray-100 p-6">
          {activeTab === 'colors' && <ColorsTabWithPreview />}
          {activeTab === 'logo' && <LogoUploadTab />}
          {activeTab === 'banner' && <BannerTabWithPreview />}
          {activeTab === 'typography' && <TypographyTabWithPreview />}
          {activeTab === 'layout' && <LayoutTabWithPreview />}
          {activeTab === 'content' && <LayoutContentTab />}
          {activeTab === 'blog' && <BlogSettingsTab />}
        </div>
      </div>
    </div>
  )
}
