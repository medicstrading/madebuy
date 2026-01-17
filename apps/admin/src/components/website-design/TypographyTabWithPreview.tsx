'use client'

import type { Tenant } from '@madebuy/shared'
import {
  TYPOGRAPHY_PRESETS,
  type TypographyPreset,
} from '@madebuy/shared/src/constants/typography'
import { Loader2, Type } from 'lucide-react'
import { useEffect, useState } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { canCustomizeTypography } from '@/lib/website-design'
import { DesignFeatureGate } from './DesignFeatureGate'
import { PreviewPanel } from './PreviewPanel'

export function TypographyTabWithPreview() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [selectedPreset, setSelectedPreset] =
    useState<TypographyPreset>('modern')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load current typography and tenant from API
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          setSelectedPreset(data.websiteDesign?.typography || 'modern')
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
          typography: selectedPreset,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save typography. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save typography:', error)
      alert('Failed to save typography. Please try again.')
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

  const hasAccess = canCustomizeTypography(tenant)

  return (
    <DesignFeatureGate
      tenant={tenant}
      feature="typography"
      hasAccess={hasAccess}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Settings */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Typography Presets
                </h2>
                <InfoTooltip content="Choose a font combination for your storefront. Each preset includes carefully paired heading and body fonts optimized for readability and visual hierarchy. Fonts are loaded from Google Fonts for optimal performance." />
              </div>
            </div>

            <div className="space-y-3">
              {(Object.keys(TYPOGRAPHY_PRESETS) as TypographyPreset[]).map(
                (preset) => {
                  const config = TYPOGRAPHY_PRESETS[preset]
                  const isSelected = selectedPreset === preset

                  return (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setSelectedPreset(preset)}
                      className={`w-full rounded-lg border-2 p-6 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {config.name}
                            </h3>
                            {isSelected && (
                              <div className="rounded-full bg-blue-500 p-1">
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {config.description}
                          </p>

                          <div className="mt-4 space-y-3">
                            {/* Heading Preview */}
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                HEADING FONT
                              </p>
                              <p
                                className="mt-1 text-2xl font-bold text-gray-900"
                                style={{
                                  fontFamily: config.heading.fontFamily,
                                }}
                              >
                                {config.heading.googleFont}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Weights: {config.heading.weights.join(', ')}
                              </p>
                            </div>

                            {/* Body Preview */}
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                BODY FONT
                              </p>
                              <p
                                className="mt-1 text-base text-gray-700"
                                style={{ fontFamily: config.body.fontFamily }}
                              >
                                {config.body.googleFont}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Weights: {config.body.weights.join(', ')}
                              </p>
                            </div>

                            {/* Font Pairing Example */}
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <h4
                                className="text-lg font-bold text-gray-900"
                                style={{
                                  fontFamily: config.heading.fontFamily,
                                }}
                              >
                                Example Product Title
                              </h4>
                              <p
                                className="mt-1 text-sm text-gray-600"
                                style={{ fontFamily: config.body.fontFamily }}
                              >
                                This is how your product descriptions and
                                general content will appear using this font
                                combination. The pairing creates visual
                                hierarchy.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                },
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-6">
              {isSaved && (
                <p className="text-sm font-medium text-green-600">
                  ✓ Typography saved successfully!
                </p>
              )}
              <button
                type="button"
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
                  'Save Typography'
                )}
              </button>
            </div>
          </div>

          {/* Typography Tips */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">
              Typography Best Practices
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>
                • Heading fonts establish your brand personality and visual
                identity
              </li>
              <li>
                • Body fonts should prioritize readability for long-form content
              </li>
              <li>
                • Good font pairings create clear visual hierarchy on your pages
              </li>
              <li>
                • All fonts are optimized and cached by Google Fonts for fast
                loading
              </li>
              <li>
                • Preview your selection on different devices before publishing
              </li>
            </ul>
          </div>

          {/* Font Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Selected Font Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Heading Font:</span>
                <span className="font-medium text-gray-900">
                  {TYPOGRAPHY_PRESETS[selectedPreset].heading.googleFont}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Body Font:</span>
                <span className="font-medium text-gray-900">
                  {TYPOGRAPHY_PRESETS[selectedPreset].body.googleFont}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Font Weights:</span>
                <span className="font-medium text-gray-900">
                  {[
                    ...new Set([
                      ...TYPOGRAPHY_PRESETS[selectedPreset].heading.weights,
                      ...TYPOGRAPHY_PRESETS[selectedPreset].body.weights,
                    ]),
                  ]
                    .sort((a, b) => a - b)
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:block">
          <PreviewPanel tenantSlug={tenant?.slug} />
        </div>
      </div>
    </DesignFeatureGate>
  )
}
