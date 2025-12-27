'use client'

import { useState, useEffect } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { Loader2 } from 'lucide-react'

export function ColorsTab() {
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
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Brand Colors</h2>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Primary Color */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Primary Color
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Main brand color used for buttons and accents
              </p>
            </div>

            <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HexColorInput
                  color={primaryColor}
                  onChange={setPrimaryColor}
                  prefixed
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div
                  className="h-10 w-10 flex-shrink-0 rounded-md border border-gray-300"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Accent Color
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Secondary color for highlights and success states
              </p>
            </div>

            <HexColorPicker color={accentColor} onChange={setAccentColor} />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HexColorInput
                  color={accentColor}
                  onChange={setAccentColor}
                  prefixed
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div
                  className="h-10 w-10 flex-shrink-0 rounded-md border border-gray-300"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mt-8 border-t pt-8">
          <h3 className="mb-4 text-sm font-medium text-gray-700">Preview</h3>
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <button
              className="rounded-lg px-4 py-2 font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Primary Button
            </button>
            <button
              className="rounded-lg px-4 py-2 font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Accent Button
            </button>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-sm text-gray-600">Primary color indicator</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-sm text-gray-600">Accent color indicator</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-4">
          {isSaved && (
            <span className="text-sm text-green-600">Saved successfully!</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> These colors will be applied across your entire storefront,
          including buttons, links, and other branded elements.
        </p>
      </div>
    </div>
  )
}
