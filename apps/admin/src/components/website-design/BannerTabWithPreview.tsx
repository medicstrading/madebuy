'use client'

import { useState, useEffect } from 'react'
import { Upload, Loader2, Sparkles } from 'lucide-react'
import { BANNER_PRESETS, type BannerPreset } from '@madebuy/shared/src/constants/bannerPresets'
import { PreviewPanel } from './PreviewPanel'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { DesignFeatureGate } from './DesignFeatureGate'
import { canCustomizeBanner } from '@/lib/website-design'
import type { Tenant } from '@madebuy/shared'

export function BannerTabWithPreview() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [banner, setBanner] = useState({
    mediaId: '',
    mediaUrl: '',
    overlayText: 'Welcome to Our Store',
    overlaySubtext: 'Discover handcrafted treasures',
    ctaButton: { text: 'Shop Now', url: '/products' },
    overlayOpacity: 40,
    height: 'medium' as 'small' | 'medium' | 'large',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  // Load current banner and tenant from API
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
          if (data.websiteDesign?.banner) {
            setBanner(data.websiteDesign.banner)
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

  const handlePresetSelect = (preset: BannerPreset) => {
    setSelectedPreset(preset.id)
    setBanner({
      mediaId: '',
      mediaUrl: preset.imageUrl, // Using gradient as placeholder
      overlayText: preset.overlayText,
      overlaySubtext: preset.overlaySubtext,
      ctaButton: preset.ctaButton,
      overlayOpacity: preset.overlayOpacity,
      height: preset.height,
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setSelectedPreset(null) // Clear preset when uploading custom image

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const media = await response.json()
        setBanner((prev) => ({
          ...prev,
          mediaId: media.id,
          mediaUrl: media.variants.original.url,
        }))
      } else {
        alert('Failed to upload image. Please try again.')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save banner. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save banner:', error)
      alert('Failed to save banner. Please try again.')
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

  const hasAccess = canCustomizeBanner(tenant)

  return (
    <DesignFeatureGate tenant={tenant} feature="banner" hasAccess={hasAccess}>
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      {/* Settings */}
      <div className="space-y-6">
        {/* AI Presets */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-semibold text-gray-900">AI-Generated Presets</h2>
              <InfoTooltip content="Choose from professionally designed banner styles. Each preset includes optimized colors, text, and overlay settings. You can customize after selecting." />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BANNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                  selectedPreset === preset.id
                    ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                {/* Gradient Preview */}
                <div
                  className="h-24 w-full"
                  style={{ background: preset.imageUrl }}
                />
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-600">{preset.description}</p>
                </div>
                {selectedPreset === preset.id && (
                  <div className="absolute right-2 top-2 rounded-full bg-purple-500 p-1">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Banner Configuration */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Custom Banner Configuration</h2>
            <p className="mt-1 text-sm text-gray-600">
              Upload your own image or customize the preset settings below
            </p>
          </div>

          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-900">Banner Image</label>
                <InfoTooltip content="Upload a high-quality image (recommended: 1920x600px, max 5MB). This appears at the top of your homepage." />
              </div>
              <div className="mt-3">
                <label
                  htmlFor="banner-upload"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
                >
                  {isUploading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  ) : banner.mediaUrl ? (
                    <div className="w-full">
                      <div
                        className="mx-auto h-32 w-full rounded-lg bg-cover bg-center"
                        style={{
                          backgroundImage: banner.mediaUrl.startsWith('linear-gradient')
                            ? banner.mediaUrl
                            : `url(${banner.mediaUrl})`,
                        }}
                      />
                      <p className="mt-2 text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div className="mx-auto">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Click to upload banner image</p>
                    </div>
                  )}
                </label>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Overlay Text */}
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-900">Headline Text</label>
                <InfoTooltip content="Main message displayed on your banner. Keep it short and impactful (3-6 words)." />
              </div>
              <input
                type="text"
                value={banner.overlayText}
                onChange={(e) => setBanner((prev) => ({ ...prev, overlayText: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Welcome to Our Store"
              />
            </div>

            {/* Subtext */}
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-900">Subheadline Text</label>
                <InfoTooltip content="Supporting text that appears below the headline. Briefly describe your value proposition." />
              </div>
              <input
                type="text"
                value={banner.overlaySubtext}
                onChange={(e) => setBanner((prev) => ({ ...prev, overlaySubtext: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Discover handcrafted treasures"
              />
            </div>

            {/* CTA Button */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-900">Button Text</label>
                  <InfoTooltip content="Text displayed on the call-to-action button." />
                </div>
                <input
                  type="text"
                  value={banner.ctaButton.text}
                  onChange={(e) =>
                    setBanner((prev) => ({
                      ...prev,
                      ctaButton: { ...prev.ctaButton, text: e.target.value },
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Shop Now"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-900">Button Link</label>
                  <InfoTooltip content="Where the button should navigate (e.g., /products)." />
                </div>
                <input
                  type="text"
                  value={banner.ctaButton.url}
                  onChange={(e) =>
                    setBanner((prev) => ({
                      ...prev,
                      ctaButton: { ...prev.ctaButton, url: e.target.value },
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="/products"
                />
              </div>
            </div>

            {/* Overlay Opacity */}
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-900">
                  Overlay Opacity: {banner.overlayOpacity}%
                </label>
                <InfoTooltip content="Dark overlay makes text easier to read. Higher values create darker overlays." />
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={banner.overlayOpacity}
                onChange={(e) =>
                  setBanner((prev) => ({ ...prev, overlayOpacity: parseInt(e.target.value) }))
                }
                className="mt-2 w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Transparent</span>
                <span>Dark</span>
              </div>
            </div>

            {/* Height */}
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-900">Banner Height</label>
                <InfoTooltip content="Choose how much vertical space the banner occupies on your homepage." />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setBanner((prev) => ({ ...prev, height: size }))}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      banner.height === size
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-6">
            {isSaved && (
              <p className="text-sm font-medium text-green-600">✓ Banner saved successfully!</p>
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
                'Save Banner'
              )}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">Banner Best Practices</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Use high-resolution images (at least 1920px wide)</li>
            <li>• Keep headline text under 6 words for maximum impact</li>
            <li>• Ensure good contrast between overlay and background image</li>
            <li>• Test your banner on mobile devices for readability</li>
            <li>• Choose images that represent your brand and products</li>
          </ul>
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:block">
        <PreviewPanel mode="banner" banner={banner} />
      </div>
    </div>
    </DesignFeatureGate>
  )
}
