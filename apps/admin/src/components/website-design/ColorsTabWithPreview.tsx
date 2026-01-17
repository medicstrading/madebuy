'use client'

import type { Tenant } from '@madebuy/shared'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { PreviewPanel } from './PreviewPanel'

export function ColorsTabWithPreview() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [accentColor, setAccentColor] = useState('#10b981')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load current colors from tenant
  useEffect(() => {
    async function loadColors() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          setPrimaryColor(data.primaryColor || '#2563eb')
          setAccentColor(data.accentColor || '#10b981')
        }
      } catch (error) {
        console.error('Failed to load colors:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadColors()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          accentColor,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save colors. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save colors:', error)
      alert('Failed to save colors. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
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
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Brand Colors
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Customize your storefront&apos;s color scheme to match your brand
              identity
            </p>
          </div>

          <div className="space-y-8">
            {/* Primary Color */}
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Primary Color
                  </label>
                  <InfoTooltip content="Main brand color used for buttons, links, and primary interactive elements. This color should represent your brand and be easily recognizable." />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <HexColorPicker
                  color={primaryColor}
                  onChange={setPrimaryColor}
                />
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Hex Code
                    </label>
                    <HexColorInput
                      color={primaryColor}
                      onChange={setPrimaryColor}
                      prefixed
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Preview
                    </label>
                    <div className="flex gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <button
                        type="button"
                        className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Button Example
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Color */}
            <div className="border-t pt-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Accent Color
                  </label>
                  <InfoTooltip content="Secondary color for highlights, badges, and call-to-action elements. Should complement your primary color and provide good contrast." />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <HexColorPicker color={accentColor} onChange={setAccentColor} />
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Hex Code
                    </label>
                    <HexColorInput
                      color={accentColor}
                      onChange={setAccentColor}
                      prefixed
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Preview
                    </label>
                    <div className="flex gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: accentColor }}
                      />
                      <button
                        type="button"
                        className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: accentColor }}
                      >
                        Badge Example
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-6">
            {isSaved && (
              <p className="text-sm font-medium text-green-600">
                ✓ Colors saved successfully!
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
                'Save Colors'
              )}
            </button>
          </div>
        </div>

        {/* Color Theory Tips */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">
            Color Tips
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Ensure sufficient contrast between text and background colors
            </li>
            <li>
              • Test your colors on different devices and lighting conditions
            </li>
            <li>
              • Consider color accessibility for users with visual impairments
            </li>
            <li>
              • Your primary color should be consistent with your brand identity
            </li>
          </ul>
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:block">
        <PreviewPanel tenantSlug={tenant?.slug} />
      </div>
    </div>
  )
}
