'use client'

import { useState, useEffect } from 'react'
import { TYPOGRAPHY_PRESETS, type TypographyPreset } from '@madebuy/shared/src/constants/typography'
import { Check } from 'lucide-react'

export function TypographyTab() {
  const [selectedPreset, setSelectedPreset] = useState<TypographyPreset>('modern')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load current typography preset
  useEffect(() => {
    async function loadTypography() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          if (data.websiteDesign?.typography) {
            setSelectedPreset(data.websiteDesign.typography)
          }
        }
      } catch (error) {
        console.error('Failed to load typography:', error)
      }
    }
    loadTypography()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteDesign: {
            typography: selectedPreset,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save typography')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save typography. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Typography</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose a typography preset to customize your storefront&apos;s fonts
          </p>
        </div>

        {/* Typography Presets Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(TYPOGRAPHY_PRESETS) as TypographyPreset[]).map((preset) => {
            const config = TYPOGRAPHY_PRESETS[preset]
            const isSelected = selectedPreset === preset

            return (
              <button
                key={preset}
                onClick={() => setSelectedPreset(preset)}
                className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 rounded-full bg-blue-600 p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className="mb-3">
                  <h3
                    className="mb-1 text-lg font-bold text-gray-900"
                    style={{ fontFamily: config.heading.fontFamily }}
                  >
                    {config.name}
                  </h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>

                {/* Font Preview */}
                <div className="space-y-2 border-t pt-3">
                  <div>
                    <p className="text-xs text-gray-500">Heading</p>
                    <p
                      className="text-base font-bold text-gray-900"
                      style={{ fontFamily: config.heading.fontFamily }}
                    >
                      The quick brown fox
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Body</p>
                    <p
                      className="text-sm text-gray-700"
                      style={{ fontFamily: config.body.fontFamily }}
                    >
                      jumps over the lazy dog
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Load Google Fonts for preview */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Merriweather:wght@700;900&family=Open+Sans:wght@400;600&family=Playfair+Display:wght@700;900&family=Lato:wght@400;700&family=Montserrat:wght@600;700;800&family=Roboto:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
          {saved && (
            <p className="text-sm text-green-600">✓ Typography saved successfully!</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Typography'}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Preview</h3>
        <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-6">
          <h1
            className="text-4xl font-bold text-gray-900"
            style={{ fontFamily: TYPOGRAPHY_PRESETS[selectedPreset].heading.fontFamily }}
          >
            Your Storefront Title
          </h1>
          <h2
            className="text-2xl font-semibold text-gray-800"
            style={{ fontFamily: TYPOGRAPHY_PRESETS[selectedPreset].heading.fontFamily }}
          >
            Product Category
          </h2>
          <p
            className="text-base text-gray-700"
            style={{ fontFamily: TYPOGRAPHY_PRESETS[selectedPreset].body.fontFamily }}
          >
            This is how your body text will look on your storefront. Your product descriptions,
            about page content, and other text elements will use this font for a consistent and
            professional appearance.
          </p>
          <p
            className="text-sm text-gray-600"
            style={{ fontFamily: TYPOGRAPHY_PRESETS[selectedPreset].body.fontFamily }}
          >
            Smaller text like captions, labels, and metadata will also use the body font family.
          </p>
        </div>
      </div>
    </div>
  )
}
