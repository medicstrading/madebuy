'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileText, Save } from 'lucide-react'
import { PreviewPanel } from './PreviewPanel'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { Tenant, LayoutTemplate, LayoutContent } from '@madebuy/shared'

const LAYOUT_NAMES: Record<LayoutTemplate, string> = {
  grid: 'Classic Store',
  minimal: 'Minimal Showcase',
  featured: 'Featured Focus',
  masonry: 'Magazine Style',
}

export function LayoutContentTab() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate>('grid')
  const [layoutContent, setLayoutContent] = useState<LayoutContent>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load current tenant and layout content
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          setSelectedLayout(data.websiteDesign?.layout || 'grid')
          setLayoutContent(data.websiteDesign?.layoutContent || {})
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleFieldChange = (field: keyof LayoutContent, value: string) => {
    setLayoutContent((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutContent,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save content. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save content:', error)
      alert('Failed to save content. Please try again.')
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      {/* Settings */}
      <div className="space-y-6">
        {/* Current Layout Info */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">
              Editing Content for: {LAYOUT_NAMES[selectedLayout]}
            </h3>
          </div>
          <p className="mt-2 text-sm text-blue-800">
            The fields below control the text and content that appears in your selected layout. Each
            field corresponds to a specific section in the preview on the right.
          </p>
        </div>

        {/* Layout-Specific Forms */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Layout Content</h2>
              <InfoTooltip content="Customize the text, headings, and descriptions that appear in your storefront. Leave fields empty to use defaults." />
            </div>
          </div>

          <div className="space-y-6">
            {/* Classic Store Layout Fields */}
            {selectedLayout === 'grid' && (
              <>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Category Section Title
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Section 1
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.categorySectionTitle || ''}
                    onChange={(e) => handleFieldChange('categorySectionTitle', e.target.value)}
                    placeholder="Shop by Category"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Appears above the category cards</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Products Section Title
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Section 2
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.productsSectionTitle || ''}
                    onChange={(e) => handleFieldChange('productsSectionTitle', e.target.value)}
                    placeholder="All Products"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Appears above the products grid</p>
                </div>
              </>
            )}

            {/* Minimal Showcase Layout Fields */}
            {selectedLayout === 'minimal' && (
              <>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Hero Headline
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Top Section
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.minimalHeroHeadline || ''}
                    onChange={(e) => handleFieldChange('minimalHeroHeadline', e.target.value)}
                    placeholder="Your Business Name (default)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Large headline at the top. Leave empty to use your business name.
                  </p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Featured Collection Title
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Bottom Section
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.featuredCollectionTitle || ''}
                    onChange={(e) => handleFieldChange('featuredCollectionTitle', e.target.value)}
                    placeholder="Featured Collection"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Title above the featured products</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    View Details Button Text
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Buttons
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.viewDetailsButtonText || ''}
                    onChange={(e) => handleFieldChange('viewDetailsButtonText', e.target.value)}
                    placeholder="View Details"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Text on product detail buttons</p>
                </div>
              </>
            )}

            {/* Featured Focus Layout Fields */}
            {selectedLayout === 'featured' && (
              <>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Collection Badge Text
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Badge
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.collectionBadgeText || ''}
                    onChange={(e) => handleFieldChange('collectionBadgeText', e.target.value)}
                    placeholder="New Collection"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Small badge at top of banner</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Collection Banner Title
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Section 1
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.collectionBannerTitle || ''}
                    onChange={(e) => handleFieldChange('collectionBannerTitle', e.target.value)}
                    placeholder="Featured Collection"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Main headline in collection banner</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Collection Banner Description
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Section 1
                    </span>
                  </label>
                  <textarea
                    value={layoutContent.collectionBannerDescription || ''}
                    onChange={(e) => handleFieldChange('collectionBannerDescription', e.target.value)}
                    placeholder="Discover our handpicked selection of exceptional pieces, crafted with passion and attention to detail."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Description text below the title</p>
                </div>

                <div className="border-t pt-6">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    &quot;Our Story&quot; Section Title
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Section 2
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.ourStoryTitle || ''}
                    onChange={(e) => handleFieldChange('ourStoryTitle', e.target.value)}
                    placeholder="Our Story"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Heading for the brand story section</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    &quot;Our Story&quot; Content
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Section 2
                    </span>
                  </label>
                  <textarea
                    value={layoutContent.ourStoryContent || ''}
                    onChange={(e) => handleFieldChange('ourStoryContent', e.target.value)}
                    placeholder="Tell your brand story here..."
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your brand story. Leave empty to use your business description.
                  </p>
                </div>

                <div className="border-t pt-6">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Signature Pieces Title
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Section 3
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.signaturePiecesTitle || ''}
                    onChange={(e) => handleFieldChange('signaturePiecesTitle', e.target.value)}
                    placeholder="Signature Pieces"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Main heading for signature products</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Signature Pieces Subtitle
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Section 3
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.signaturePiecesSubtitle || ''}
                    onChange={(e) => handleFieldChange('signaturePiecesSubtitle', e.target.value)}
                    placeholder="Our most beloved creations"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Subtitle below the section heading</p>
                </div>
              </>
            )}

            {/* Magazine Style Layout Fields */}
            {selectedLayout === 'masonry' && (
              <>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    &quot;Latest&quot; Badge Text
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Badge
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.latestBadgeText || ''}
                    onChange={(e) => handleFieldChange('latestBadgeText', e.target.value)}
                    placeholder="Latest"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Badge text on featured product</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Hero Headline
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Top Section
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.magazineHeroHeadline || ''}
                    onChange={(e) => handleFieldChange('magazineHeroHeadline', e.target.value)}
                    placeholder="Product name (automatic)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Custom headline. Leave empty to use featured product name.
                  </p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    &quot;Discover More&quot; Button Text
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Button
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.discoverMoreButtonText || ''}
                    onChange={(e) => handleFieldChange('discoverMoreButtonText', e.target.value)}
                    placeholder="Discover More"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Call-to-action button text</p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    Collection Section Title
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Bottom Section
                    </span>
                  </label>
                  <input
                    type="text"
                    value={layoutContent.moreCollectionTitle || ''}
                    onChange={(e) => handleFieldChange('moreCollectionTitle', e.target.value)}
                    placeholder="More From Our Collection"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Heading for additional products section</p>
                </div>
              </>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t pt-6">
            {isSaved && (
              <p className="text-sm font-medium text-green-600">✓ Content saved successfully!</p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Content
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper Tips */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Content Tips</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Color-coded badges match sections in the preview →</li>
            <li>• Leave fields empty to use default text</li>
            <li>• Save changes and refresh your storefront to see updates</li>
            <li>• Each layout has different content areas</li>
          </ul>
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:block">
        <PreviewPanel mode="layout" layout={selectedLayout} layoutContent={layoutContent} />
      </div>
    </div>
  )
}
