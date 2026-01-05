'use client'

import { useState, useEffect } from 'react'
import { Loader2, Layout, Store, Target, Camera, Newspaper, Check, Crown, AlertCircle } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { DesignFeatureGate } from './DesignFeatureGate'
import { canCustomizeLayout } from '@/lib/website-design'
import type { Tenant, WebsiteTemplate, WebsitePage } from '@madebuy/shared'
import { TEMPLATE_DEFINITIONS, getDefaultPages } from '@madebuy/shared'

interface TemplatePickerTabProps {
  onTemplateChange?: () => void
}

interface TemplateOption {
  id: WebsiteTemplate
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  bestFor: string
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'classic-store',
    name: 'Classic Store',
    description: 'Full-featured e-commerce with hero, products, collections, blog, and testimonials',
    icon: Store,
    features: TEMPLATE_DEFINITIONS['classic-store'].features,
    bestFor: TEMPLATE_DEFINITIONS['classic-store'].bestFor,
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Conversion-focused with hero, features, testimonials, and CTA. Products on separate page.',
    icon: Target,
    features: TEMPLATE_DEFINITIONS['landing-page'].features,
    bestFor: TEMPLATE_DEFINITIONS['landing-page'].bestFor,
  },
  {
    id: 'portfolio',
    name: 'Portfolio / Gallery',
    description: 'Visual-first masonry layout, perfect for artists and photographers',
    icon: Camera,
    features: TEMPLATE_DEFINITIONS['portfolio'].features,
    bestFor: TEMPLATE_DEFINITIONS['portfolio'].bestFor,
  },
  {
    id: 'magazine',
    name: 'Magazine / Editorial',
    description: 'Blog-forward storytelling layout with featured articles and editorial feel',
    icon: Newspaper,
    features: TEMPLATE_DEFINITIONS['magazine'].features,
    bestFor: TEMPLATE_DEFINITIONS['magazine'].bestFor,
  },
]

export function TemplatePickerTab({ onTemplateChange }: TemplatePickerTabProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate>('classic-store')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showResetWarning, setShowResetWarning] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<WebsiteTemplate | null>(null)

  // Load current template from API
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          // Use new template system or fall back to mapping from old layout
          if (data.websiteDesign?.template) {
            setSelectedTemplate(data.websiteDesign.template)
          } else if (data.websiteDesign?.layout) {
            // Map old layout to new template
            const layoutToTemplate: Record<string, WebsiteTemplate> = {
              'grid': 'classic-store',
              'minimal': 'landing-page',
              'featured': 'portfolio',
              'masonry': 'magazine',
            }
            setSelectedTemplate(layoutToTemplate[data.websiteDesign.layout] || 'classic-store')
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleTemplateSelect = (templateId: WebsiteTemplate) => {
    // If changing templates and user already has custom pages, show warning
    const currentTemplate = tenant?.websiteDesign?.template
    if (currentTemplate && currentTemplate !== templateId && tenant?.websiteDesign?.pages?.length) {
      setPendingTemplate(templateId)
      setShowResetWarning(true)
    } else {
      setSelectedTemplate(templateId)
    }
  }

  const confirmTemplateChange = async () => {
    if (!pendingTemplate) return

    setSelectedTemplate(pendingTemplate)
    setShowResetWarning(false)
    setPendingTemplate(null)

    // Save with reset pages
    await saveTemplate(pendingTemplate, true)
  }

  const cancelTemplateChange = () => {
    setShowResetWarning(false)
    setPendingTemplate(null)
  }

  const saveTemplate = async (template: WebsiteTemplate, resetPages: boolean = false) => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const payload: Record<string, unknown> = {
        template,
      }

      // If resetting pages or this is first template selection, set default pages
      if (resetPages || !tenant?.websiteDesign?.pages?.length) {
        payload.pages = getDefaultPages(template)
      }

      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setIsSaved(true)
        // Update local tenant state
        if (tenant) {
          setTenant({
            ...tenant,
            websiteDesign: {
              ...tenant.websiteDesign,
              template,
              pages: payload.pages as WebsitePage[] | undefined,
            },
          } as Tenant)
        }
        // Notify parent of template change
        onTemplateChange?.()
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save template. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => saveTemplate(selectedTemplate)

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Website Template</h2>
          <InfoTooltip content="Choose a template that best matches your business. Each template comes with pre-configured sections that you can customize in the Page Builder." />
        </div>

        {/* Reset Warning Modal */}
        {showResetWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-amber-100 p-2">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reset Page Sections?</h3>
              </div>
              <p className="mb-6 text-gray-600">
                Changing templates will reset your page sections to the new template&apos;s defaults.
                Your current section customizations will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelTemplateChange}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTemplateChange}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Reset & Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATE_OPTIONS.map((template) => {
            const Icon = template.icon
            const isSelected = selectedTemplate === template.id
            const isCurrentSaved = tenant.websiteDesign?.template === template.id

            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                {/* Current badge */}
                {isCurrentSaved && (
                  <div className="absolute -top-2 -right-2 rounded-full bg-green-500 p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

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
                      <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{template.description}</p>

                    {/* Best for */}
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">Best for:</span> {template.bestFor}
                    </p>

                    {/* Features */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.features.slice(0, 4).map((feature, index) => (
                        <span
                          key={index}
                          className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Template Preview Thumbnail */}
                <div className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                  <TemplatePreviewThumbnail templateId={template.id} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Selected: <span className="text-blue-600">{TEMPLATE_OPTIONS.find(t => t.id === selectedTemplate)?.name}</span>
            </p>
            {tenant.websiteDesign?.template !== selectedTemplate && (
              <p className="text-xs text-gray-500">Unsaved changes</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isSaved && (
              <p className="text-sm font-medium text-green-600">Template saved!</p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || tenant.websiteDesign?.template === selectedTemplate}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">What&apos;s Next?</h3>
          <p className="text-sm text-blue-800">
            After selecting a template, head to the <strong>Page Builder</strong> tab to customize
            your page sections. You can add, remove, and reorder sections to create your perfect layout.
          </p>
        </div>
      </div>
    </DesignFeatureGate>
  )
}

// Simple template preview thumbnails
function TemplatePreviewThumbnail({ templateId }: { templateId: WebsiteTemplate }) {
  const baseStyles = "p-3 h-full"

  if (templateId === 'classic-store') {
    return (
      <div className={baseStyles}>
        <div className="h-1/4 mb-2 rounded bg-gray-300" /> {/* Hero */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded bg-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (templateId === 'landing-page') {
    return (
      <div className={baseStyles}>
        <div className="h-1/2 mb-2 rounded bg-gray-300 flex items-center justify-center">
          <div className="w-1/3 h-2 bg-gray-400 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-gray-200" />
          ))}
        </div>
        <div className="h-4 rounded bg-gray-300 w-1/2 mx-auto" />
      </div>
    )
  }

  if (templateId === 'portfolio') {
    return (
      <div className={baseStyles}>
        <div className="h-1/4 mb-2 rounded bg-gray-300" />
        <div className="grid grid-cols-3 gap-1">
          <div className="row-span-2 rounded bg-gray-200" />
          <div className="rounded bg-gray-200" />
          <div className="rounded bg-gray-200" />
          <div className="rounded bg-gray-200" />
          <div className="rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  // Magazine
  return (
    <div className={baseStyles}>
      <div className="h-1/4 mb-2 rounded bg-gray-300" />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="h-12 rounded bg-gray-200" />
        <div className="space-y-1">
          <div className="h-5 rounded bg-gray-200" />
          <div className="h-5 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-4 rounded bg-gray-200" />
    </div>
  )
}
