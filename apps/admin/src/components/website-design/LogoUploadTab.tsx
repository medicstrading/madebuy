'use client'

import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

export function LogoUploadTab() {
  const [logo, setLogo] = useState<{
    mediaId?: string
    url?: string
  }>({})
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load current logo from tenant
  useEffect(() => {
    async function loadLogo() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          if (data.logoMediaId) {
            // Fetch logo media details
            const mediaResponse = await fetch(`/api/media/${data.logoMediaId}`)
            if (mediaResponse.ok) {
              const mediaData = await mediaResponse.json()
              setLogo({
                mediaId: data.logoMediaId,
                url: mediaData.variants.original.url,
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to load logo:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLogo()
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        const media = data.media || data // Handle both response formats
        setLogo({
          mediaId: media.id,
          url: media.variants.original.url,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || 'Failed to upload logo. Please try again.')
      }
    } catch (error) {
      console.error('Failed to upload logo:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogo({})
  }

  const handleSave = async () => {
    setIsSaving(true)
    setIsSaved(false)

    try {
      const response = await fetch('/api/website-design/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoMediaId: logo.mediaId || null,
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      } else {
        alert('Failed to save logo. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save logo:', error)
      alert('Failed to save logo. Please try again.')
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
      {/* Logo Upload */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Store Logo</h2>
            <InfoTooltip content="Upload your logo to appear in the header of your storefront. For best results, use a PNG with transparent background. Recommended size: 200x60px or similar aspect ratio." />
          </div>
        </div>

        {/* Current Logo Preview */}
        {logo.url ? (
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Current Logo
            </p>
            <div className="relative inline-block">
              <div className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-4">
                <div className="relative h-20 w-auto">
                  <Image
                    src={logo.url}
                    alt="Store logo"
                    width={200}
                    height={60}
                    className="h-full w-auto object-contain"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-colors hover:bg-red-600"
                title="Remove logo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No logo uploaded</p>
          </div>
        )}

        {/* Upload Button */}
        <div>
          <label
            htmlFor="logo-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                {logo.url ? 'Replace Logo' : 'Upload Logo'}
              </>
            )}
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={isUploading}
            className="hidden"
          />
        </div>

        {/* Guidelines */}
        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">
            Logo Guidelines
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Use PNG format with transparent background for best results
            </li>
            <li>• Recommended size: 200x60px (landscape orientation)</li>
            <li>• Maximum file size: 5MB</li>
            <li>• Logo will be displayed in the storefront header</li>
            <li>• Ensure good contrast against white background</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t pt-6">
          {isSaved && (
            <p className="text-sm font-medium text-green-600">
              ✓ Logo saved successfully!
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !logo.mediaId}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Logo'
            )}
          </button>
        </div>
      </div>

      {/* Logo Preview in Context */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Preview</h3>
        <p className="mb-4 text-sm text-gray-600">
          How your logo will appear in the storefront header
        </p>

        {/* Mock Header Preview */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              {logo.url ? (
                <div className="relative h-12 w-auto">
                  <Image
                    src={logo.url}
                    alt="Store logo preview"
                    width={150}
                    height={48}
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">
                  Your Store Name
                </h1>
              )}
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Cart
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              Storefront content appears here...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
