'use client'

import { useState } from 'react'
import { ColorsTabWithPreview } from '@/components/website-design/ColorsTabWithPreview'
import { TypographyTabWithPreview } from '@/components/website-design/TypographyTabWithPreview'
import { BannerTabWithPreview } from '@/components/website-design/BannerTabWithPreview'
import { LayoutTabWithPreview } from '@/components/website-design/LayoutTabWithPreview'
import { LayoutContentTab } from '@/components/website-design/LayoutContentTab'
import { LogoUploadTab } from '@/components/website-design/LogoUploadTab'
import { BlogSettingsTab } from '@/components/website-design/BlogSettingsTab'
import { Paintbrush, Type, Layout, Image as ImageIcon, Sparkles, FileText, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabValue = 'colors' | 'logo' | 'banner' | 'typography' | 'layout' | 'content' | 'blog'

const tabs = [
  { value: 'colors' as const, label: 'Colors', icon: Paintbrush, disabled: false },
  { value: 'logo' as const, label: 'Logo', icon: Sparkles, disabled: false },
  { value: 'banner' as const, label: 'Banner', icon: ImageIcon, disabled: false },
  { value: 'typography' as const, label: 'Typography', icon: Type, disabled: false },
  { value: 'layout' as const, label: 'Layout', icon: Layout, disabled: false },
  { value: 'content' as const, label: 'Content', icon: FileText, disabled: false },
  { value: 'blog' as const, label: 'Blog', icon: BookOpen, disabled: false },
]

export default function WebsiteDesignPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('colors')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Website Design</h1>
        <p className="mt-2 text-gray-600">
          Customize your storefront&apos;s appearance and branding
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value

            return (
              <button
                key={tab.value}
                onClick={() => !tab.disabled && setActiveTab(tab.value)}
                disabled={tab.disabled}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
                {tab.disabled && (
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'colors' && <ColorsTabWithPreview />}
        {activeTab === 'logo' && <LogoUploadTab />}
        {activeTab === 'banner' && <BannerTabWithPreview />}
        {activeTab === 'typography' && <TypographyTabWithPreview />}
        {activeTab === 'layout' && <LayoutTabWithPreview />}
        {activeTab === 'content' && <LayoutContentTab />}
        {activeTab === 'blog' && <BlogSettingsTab />}
      </div>
    </div>
  )
}
