'use client'

import { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface BannerSettings {
  mediaId?: string
  mediaUrl?: string
  overlayText?: string
  overlaySubtext?: string
  ctaButton?: {
    text: string
    url: string
  }
  overlayOpacity: number
  height: 'small' | 'medium' | 'large'
}

export function BannerTab() {
  const [banner, setBanner] = useState<BannerSettings>({
    overlayOpacity: 40,
    height: 'medium',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load current banner settings
  useEffect(() => {
    async function loadBanner() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          if (data.websiteDesign?.banner) {
            setBanner({
              ...data.websiteDesign.banner,
              mediaUrl: data.websiteDesign.banner.mediaId
                ? `/api/media/${data.websiteDesign.banner.mediaId}`
                : undefined,
            })
          }
        }
      } catch (error) {
        console.error('Failed to load banner:', error)
      }
    }
    loadBanner()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const media = await response.json()
      setBanner((prev) => ({
        ...prev,
        mediaId: media.id,
        mediaUrl: media.variants.original.url,
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setBanner((prev) => ({
      ...prev,
      mediaId: undefined,
      mediaUrl: undefined,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteDesign: {
            banner: {
              mediaId: banner.mediaId,
              overlayText: banner.overlayText,
              overlaySubtext: banner.overlaySubtext,
              ctaButton: banner.ctaButton,
              overlayOpacity: banner.overlayOpacity,
              height: banner.height,
            },
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to save banner')

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save banner. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const heightSizes = {
    small: '300px',
    medium: '400px',
    large: '500px',
  }

  return (
    <div className="space-y-6">
      {/* Banner Image Upload */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Hero Banner</h2>
        <p className="mb-6 text-sm text-gray-600">
          Upload a banner image for your storefront homepage
        </p>

        {banner.mediaUrl ? (
          <div className="relative aspect-[16/6] overflow-hidden rounded-lg border border-gray-200">
            <Image
              src={banner.mediaUrl}
              alt="Banner"
              fill
              className="object-cover"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex aspect-[16/6] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
            <Upload className="mb-2 h-12 w-12 text-gray-400" />
            <p className="mb-1 text-sm font-medium text-gray-700">
              {uploading ? 'Uploading...' : 'Click to upload banner image'}
            </p>
            <p className="text-xs text-gray-500">Recommended: 1920x720px</p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Banner Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Banner Settings</h3>

        <div className="space-y-4">
          {/* Height */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Banner Height
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setBanner((prev) => ({ ...prev, height: size }))}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-all ${
                    banner.height === size
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Preview height: {heightSizes[banner.height]}
            </p>
          </div>

          {/* Overlay Opacity */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Overlay Darkness ({banner.overlayOpacity}%)
            </label>
            <input
              type="range"
              min="0"
              max="80"
              value={banner.overlayOpacity}
              onChange={(e) =>
                setBanner((prev) => ({ ...prev, overlayOpacity: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          {/* Overlay Text */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Main Heading
            </label>
            <input
              type="text"
              value={banner.overlayText || ''}
              onChange={(e) =>
                setBanner((prev) => ({ ...prev, overlayText: e.target.value }))
              }
              placeholder="Welcome to Our Store"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Overlay Subtext */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subheading
            </label>
            <input
              type="text"
              value={banner.overlaySubtext || ''}
              onChange={(e) =>
                setBanner((prev) => ({ ...prev, overlaySubtext: e.target.value }))
              }
              placeholder="Discover our handmade products"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* CTA Button */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Call-to-Action Button
            </label>
            <input
              type="text"
              value={banner.ctaButton?.text || ''}
              onChange={(e) =>
                setBanner((prev) => ({
                  ...prev,
                  ctaButton: { ...prev.ctaButton, text: e.target.value, url: prev.ctaButton?.url || '' },
                }))
              }
              placeholder="Shop Now"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={banner.ctaButton?.url || ''}
              onChange={(e) =>
                setBanner((prev) => ({
                  ...prev,
                  ctaButton: { text: prev.ctaButton?.text || '', url: e.target.value },
                }))
              }
              placeholder="/products"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {saved && (
          <p className="text-sm text-green-600">✓ Banner saved successfully!</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !banner.mediaId}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Banner'}
        </button>
      </div>
    </div>
  )
}
