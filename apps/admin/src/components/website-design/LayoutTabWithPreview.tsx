'use client'

import { useState, useEffect } from 'react'
import { Loader2, Layout, Grid, List, Star, Columns } from 'lucide-react'
import { PreviewPanel } from './PreviewPanel'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { DesignFeatureGate } from './DesignFeatureGate'
import { canCustomizeLayout } from '@/lib/website-design'
import type { Tenant } from '@madebuy/shared'

type LayoutTemplate = 'grid' | 'minimal' | 'featured' | 'masonry'

interface LayoutOption {
  id: LayoutTemplate
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'grid',
    name: 'Classic Store',
    description: 'Traditional e-commerce layout with multiple sections',
    icon: Grid,
    features: [
      'Hero banner at top',
      'Categories section',
      'Products grid below',
      'Standard e-commerce flow',
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal Showcase',
    description: 'Clean, spacious layout with focus on hero and featured items',
    icon: List,
    features: [
      'Large hero section',
      'Featured products only',
      'Generous whitespace',
      'Ideal for artisan brands',
    ],
  },
  {
    id: 'featured',
    name: 'Featured Focus',
    description: 'Story-driven layout with featured collections and highlights',
    icon: Star,
    features: [
      'Featured collection banner',
      'About/story section',
      'Highlighted products',
      'Brand storytelling emphasis',
    ],
  },
  {
    id: 'masonry',
    name: 'Magazine Style',
    description: 'Editorial layout with mixed content blocks and visuals',
    icon: Columns,
    features: [
      'Mixed section heights',
      'Editorial content blocks',
      'Visual variety',
      'Engaging browsing experience',
    ],
  },
]

export function LayoutTabWithPreview() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate>('grid')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load current layout and tenant from API
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          setSelectedLayout(data.websiteDesign?.layout || 'grid')
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: selectedLayout,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save layout. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
      alert('Failed to save layout. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !tenant) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const hasAccess = canCustomizeLayout(tenant)

  return (
    <DesignFeatureGate tenant={tenant} feature="layout" hasAccess={hasAccess}>
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      {/* Settings */}
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Homepage Layout</h2>
              <InfoTooltip content="Choose how your products are displayed on your storefront homepage. Each layout creates a different visual experience for your customers." />
            </div>
          </div>

          <div className="space-y-4">
            {LAYOUT_OPTIONS.map((layout) => {
              const Icon = layout.icon
              const isSelected = selectedLayout === layout.id

              return (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={`w-full rounded-lg border-2 p-5 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`rounded-lg p-3 ${
                        isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{layout.name}</h3>
                        {isSelected && (
                          <div className="rounded-full bg-blue-500 p-1">
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{layout.description}</p>

                      {/* Features */}
                      <ul className="mt-3 space-y-1">
                        {layout.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <svg
                              className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="hidden sm:block">
                      <div className="h-24 w-32 overflow-hidden rounded border border-gray-200 bg-gray-50">
                        {layout.id === 'grid' && (
                          <div className="grid h-full grid-cols-2 gap-1 p-2">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="rounded bg-gray-300" />
                            ))}
                          </div>
                        )}
                        {layout.id === 'minimal' && (
                          <div className="flex h-full flex-col gap-2 p-2">
                            <div className="h-1/2 rounded bg-gray-300" />
                            <div className="h-1/2 rounded bg-gray-300" />
                          </div>
                        )}
                        {layout.id === 'featured' && (
                          <div className="grid h-full grid-cols-2 gap-1 p-2">
                            <div className="col-span-2 rounded bg-gray-400" />
                            <div className="rounded bg-gray-300" />
                            <div className="rounded bg-gray-300" />
                          </div>
                        )}
                        {layout.id === 'masonry' && (
                          <div className="grid h-full grid-cols-2 gap-1 p-2">
                            <div className="row-span-2 rounded bg-gray-400" />
                            <div className="rounded bg-gray-300" />
                            <div className="rounded bg-gray-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-6">
            {isSaved && (
              <p className="text-sm font-medium text-green-600">✓ Layout saved successfully!</p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Layout'
              )}
            </button>
          </div>
        </div>

        {/* Layout Tips */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">Understanding Homepage Layouts</h3>
          <p className="mb-3 text-sm text-blue-800">
            Each layout defines how different <strong>page sections</strong> are arranged on your homepage.
            Sections are content blocks like hero banners, product grids, categories, and story areas.
          </p>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Classic Store:</strong> Traditional flow with hero → categories → products</li>
            <li>• <strong>Minimal Showcase:</strong> Spacious hero → curated featured items only</li>
            <li>• <strong>Featured Focus:</strong> Collection banner → brand story → signature pieces</li>
            <li>• <strong>Magazine Style:</strong> Editorial blocks with varied content and imagery</li>
            <li>• All layouts are fully responsive and mobile-optimized</li>
          </ul>
        </div>

        {/* Current Selection */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Selected Layout Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Layout Name:</span>
              <span className="font-medium text-gray-900">
                {LAYOUT_OPTIONS.find((l) => l.id === selectedLayout)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Best For:</span>
              <span className="font-medium text-gray-900">
                {selectedLayout === 'grid' && 'Large catalogs'}
                {selectedLayout === 'minimal' && 'Luxury brands'}
                {selectedLayout === 'featured' && 'Promoting items'}
                {selectedLayout === 'masonry' && 'Visual variety'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:block">
        <PreviewPanel mode="layout" layout={selectedLayout} />
      </div>
    </div>
    </DesignFeatureGate>
  )
}
