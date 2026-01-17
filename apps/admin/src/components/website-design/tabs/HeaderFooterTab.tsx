'use client'

import type { FooterConfig, HeaderConfig } from '@madebuy/shared'
import { Check, Layout, Menu } from 'lucide-react'

interface HeaderFooterTabProps {
  headerConfig: HeaderConfig
  footerConfig: FooterConfig
  onHeaderChange: (config: HeaderConfig) => void
  onFooterChange: (config: FooterConfig) => void
  tenantSlug?: string
}

const HEADER_STYLES = [
  {
    id: 'default' as const,
    name: 'Default',
    description: 'Logo left, nav right',
    preview: (
      <div className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-gray-200">
        <div className="w-4 h-4 bg-gray-300 rounded" />
        <div className="flex gap-1">
          <div className="w-6 h-1.5 bg-gray-200 rounded" />
          <div className="w-6 h-1.5 bg-gray-200 rounded" />
          <div className="w-6 h-1.5 bg-gray-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'centered' as const,
    name: 'Centered',
    description: 'Logo and nav centered',
    preview: (
      <div className="flex flex-col items-center gap-1 px-2 py-1.5 bg-white rounded border border-gray-200">
        <div className="w-6 h-3 bg-gray-300 rounded" />
        <div className="flex gap-1">
          <div className="w-5 h-1.5 bg-gray-200 rounded" />
          <div className="w-5 h-1.5 bg-gray-200 rounded" />
          <div className="w-5 h-1.5 bg-gray-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'Clean, icon-only nav',
    preview: (
      <div className="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-gray-200">
        <div className="w-4 h-4 bg-gray-300 rounded" />
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-200 rounded" />
          <div className="w-2 h-2 bg-gray-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'transparent' as const,
    name: 'Transparent',
    description: 'Overlays hero image',
    preview: (
      <div className="relative">
        <div className="w-full h-8 bg-gradient-to-r from-gray-700 to-gray-600 rounded" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-1.5">
          <div className="w-4 h-4 bg-white/50 rounded" />
          <div className="flex gap-1">
            <div className="w-6 h-1.5 bg-white/30 rounded" />
            <div className="w-6 h-1.5 bg-white/30 rounded" />
          </div>
        </div>
      </div>
    ),
  },
]

const FOOTER_STYLES = [
  {
    id: 'default' as const,
    name: 'Full',
    description: '4-column layout with all info',
    preview: (
      <div className="px-2 py-2 bg-gray-800 rounded border border-gray-700">
        <div className="grid grid-cols-4 gap-1 mb-1">
          <div className="space-y-0.5">
            <div className="w-4 h-1.5 bg-gray-600 rounded" />
            <div className="w-6 h-1 bg-gray-700 rounded" />
          </div>
          <div className="space-y-0.5">
            <div className="w-4 h-1.5 bg-gray-600 rounded" />
            <div className="w-6 h-1 bg-gray-700 rounded" />
          </div>
          <div className="space-y-0.5">
            <div className="w-4 h-1.5 bg-gray-600 rounded" />
            <div className="w-6 h-1 bg-gray-700 rounded" />
          </div>
          <div className="space-y-0.5">
            <div className="w-4 h-1.5 bg-gray-600 rounded" />
            <div className="w-6 h-1 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-px bg-gray-700" />
        <div className="mt-1 flex justify-between">
          <div className="w-10 h-1 bg-gray-700 rounded" />
          <div className="w-6 h-1 bg-gray-700 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'standard' as const,
    name: 'Simple',
    description: '2-column compact layout',
    preview: (
      <div className="px-2 py-2 bg-gray-800 rounded border border-gray-700">
        <div className="flex justify-between mb-1">
          <div className="space-y-0.5">
            <div className="w-6 h-1.5 bg-gray-600 rounded" />
            <div className="w-8 h-1 bg-gray-700 rounded" />
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-700 rounded" />
            <div className="w-2 h-2 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-px bg-gray-700" />
        <div className="mt-1 flex justify-center">
          <div className="w-12 h-1 bg-gray-700 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'Single line footer',
    preview: (
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-800 rounded border border-gray-700">
        <div className="w-8 h-1 bg-gray-700 rounded" />
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-700 rounded" />
          <div className="w-2 h-2 bg-gray-700 rounded" />
        </div>
      </div>
    ),
  },
]

export function HeaderFooterTab({
  headerConfig,
  footerConfig,
  onHeaderChange,
  onFooterChange,
  tenantSlug,
}: HeaderFooterTabProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-serif text-gray-900 mb-3">
          Header & Footer
        </h1>
        <p className="text-gray-600 text-lg">
          Customize your site&apos;s navigation and footer.
        </p>
      </div>

      {/* Header Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Menu className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Header Style
            </h2>
            <p className="text-sm text-gray-500">
              Choose how your navigation appears
            </p>
          </div>
        </div>

        {/* Header Style Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {HEADER_STYLES.map((style) => {
            const isSelected = (headerConfig.style || 'default') === style.id

            return (
              <button
                type="button"
                key={style.id}
                onClick={() =>
                  onHeaderChange({ ...headerConfig, style: style.id })
                }
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="mb-3">{style.preview}</div>
                <h4 className="font-medium text-gray-900 text-sm">
                  {style.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {style.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Header Options */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={headerConfig.showSocialIcons ?? false}
              onChange={(e) =>
                onHeaderChange({
                  ...headerConfig,
                  showSocialIcons: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Show social icons in header
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={headerConfig.sticky ?? true}
              onChange={(e) =>
                onHeaderChange({ ...headerConfig, sticky: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Sticky header on scroll
            </span>
          </label>
        </div>
      </section>

      {/* Footer Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100">
            <Layout className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Footer Style
            </h2>
            <p className="text-sm text-gray-500">
              Choose how your footer appears
            </p>
          </div>
        </div>

        {/* Footer Style Options */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {FOOTER_STYLES.map((style) => {
            const isSelected = (footerConfig.style || 'default') === style.id

            return (
              <button
                type="button"
                key={style.id}
                onClick={() =>
                  onFooterChange({ ...footerConfig, style: style.id })
                }
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="mb-3">{style.preview}</div>
                <h4 className="font-medium text-gray-900 text-sm">
                  {style.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {style.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Footer Options */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={footerConfig.showPaymentMethods ?? true}
              onChange={(e) =>
                onFooterChange({
                  ...footerConfig,
                  showPaymentMethods: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Show payment method icons
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={footerConfig.showSocialLinks ?? true}
              onChange={(e) =>
                onFooterChange({
                  ...footerConfig,
                  showSocialLinks: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Show social links</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={footerConfig.showPoweredBy ?? true}
              onChange={(e) =>
                onFooterChange({
                  ...footerConfig,
                  showPoweredBy: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Show &quot;Powered by MadeBuy&quot;
            </span>
          </label>
        </div>
      </section>
    </div>
  )
}
