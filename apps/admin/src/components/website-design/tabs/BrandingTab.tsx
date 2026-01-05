'use client'

import { useState, useEffect } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { Upload, Loader2, Check, Palette, Type as TypeIcon, Image as ImageIcon } from 'lucide-react'
import { TYPOGRAPHY_PRESETS, type TypographyPreset } from '@madebuy/shared/src/constants/typography'

interface BrandingTabProps {
  logoMediaId?: string
  logoUrl?: string
  primaryColor: string
  accentColor: string
  typography: TypographyPreset
  onLogoChange: (mediaId: string, url: string) => void
  onColorsChange: (primary: string, accent: string) => void
  onTypographyChange: (typography: TypographyPreset) => void
  tenantSlug?: string
}

export function BrandingTab({
  logoMediaId,
  logoUrl,
  primaryColor,
  accentColor,
  typography,
  onLogoChange,
  onColorsChange,
  onTypographyChange,
  tenantSlug,
}: BrandingTabProps) {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [localPrimary, setLocalPrimary] = useState(primaryColor)
  const [localAccent, setLocalAccent] = useState(accentColor)

  useEffect(() => {
    setLocalPrimary(primaryColor)
    setLocalAccent(accentColor)
  }, [primaryColor, accentColor])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const media = await response.json()
        onLogoChange(media.id, media.variants.original.url)
      }
    } catch (error) {
      console.error('Logo upload failed:', error)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleColorBlur = () => {
    if (localPrimary !== primaryColor || localAccent !== accentColor) {
      onColorsChange(localPrimary, localAccent)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-serif text-gray-900 mb-3">Your Brand Style</h1>
        <p className="text-gray-600 text-lg">
          Customize colors and fonts to match your brand identity.
        </p>
      </div>

      {/* Logo Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-100">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Logo</h2>
            <p className="text-sm text-gray-500">Your store&apos;s visual identity</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Logo Upload Area */}
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              logoUrl ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
            }`}>
              {isUploadingLogo ? (
                <div className="py-4">
                  <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin" />
                  <p className="text-sm text-gray-500 mt-3">Uploading...</p>
                </div>
              ) : logoUrl ? (
                <div>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="max-h-20 mx-auto object-contain"
                  />
                  <p className="text-sm text-gray-500 mt-4">Click to replace</p>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="w-10 h-10 mx-auto text-gray-400" />
                  <p className="text-base text-gray-600 mt-3 font-medium">Upload your logo</p>
                  <p className="text-sm text-gray-400 mt-1">PNG with transparent background recommended</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>

          {/* Logo Preview in Header */}
          <div className="sm:w-72 flex-shrink-0">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ backgroundColor: localPrimary + '10' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: localPrimary }} />
                )}
                <span className="font-medium text-gray-900">Your Store</span>
              </div>
              <div className="px-4 py-3 text-sm text-gray-500">
                Your storefront header
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Colors</h2>
            <p className="text-sm text-gray-500">Your brand&apos;s color palette</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Primary Color */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Primary Color</label>
              <span className="text-xs text-gray-400">Buttons, links, CTAs</span>
            </div>
            <div className="flex gap-4">
              <HexColorPicker
                color={localPrimary}
                onChange={setLocalPrimary}
                style={{ width: '100%', height: 150 }}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                style={{ backgroundColor: localPrimary }}
              />
              <HexColorInput
                color={localPrimary}
                onChange={setLocalPrimary}
                onBlur={handleColorBlur}
                prefixed
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Accent Color</label>
              <span className="text-xs text-gray-400">Highlights, badges</span>
            </div>
            <div className="flex gap-4">
              <HexColorPicker
                color={localAccent}
                onChange={setLocalAccent}
                style={{ width: '100%', height: 150 }}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
                style={{ backgroundColor: localAccent }}
              />
              <HexColorInput
                color={localAccent}
                onChange={setLocalAccent}
                onBlur={handleColorBlur}
                prefixed
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: localPrimary }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: localAccent }}
            >
              Accent Button
            </button>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: localAccent + '20', color: localAccent }}
            >
              Badge Example
            </span>
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100">
            <TypeIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Typography</h2>
            <p className="text-sm text-gray-500">Font styles for your store</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(TYPOGRAPHY_PRESETS) as TypographyPreset[]).map((preset) => {
            const config = TYPOGRAPHY_PRESETS[preset]
            const isSelected = typography === preset

            return (
              <button
                key={preset}
                onClick={() => onTypographyChange(preset)}
                className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <h3
                  className="text-xl font-bold text-gray-900 mb-2"
                  style={{ fontFamily: config.heading.fontFamily }}
                >
                  {config.name}
                </h3>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: config.body.fontFamily }}
                >
                  {config.description}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                  <p className="text-xs text-gray-400">
                    Heading: {config.heading.googleFont}
                  </p>
                  <p className="text-xs text-gray-400">
                    Body: {config.body.googleFont}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
