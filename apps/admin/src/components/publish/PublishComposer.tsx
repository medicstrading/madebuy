'use client'

import { useState } from 'react'
import type { SocialPlatform, MediaItem } from '@madebuy/shared'
import { Instagram, Facebook, Youtube, Sparkles, Send, Calendar } from 'lucide-react'
import Image from 'next/image'

interface PublishComposerProps {
  tenantId: string
  connectedPlatforms: SocialPlatform[]
  availableMedia: MediaItem[]
}

const platformConfig = {
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  tiktok: { name: 'TikTok', icon: () => <span>🎵</span>, color: 'text-black' },
  pinterest: { name: 'Pinterest', icon: () => <span>📌</span>, color: 'text-red-600' },
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
}

export function PublishComposer({ tenantId, connectedPlatforms, availableMedia }: PublishComposerProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
  const [selectedMedia, setSelectedMedia] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null)

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const toggleMedia = (mediaId: string) => {
    setSelectedMedia(prev =>
      prev.includes(mediaId)
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    )
  }

  const handleGenerateCaption = async () => {
    if (selectedMedia.length === 0) {
      alert('Please select at least one image to generate a caption')
      return
    }

    setGeneratingCaption(true)

    try {
      const response = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: selectedMedia,
          style: 'professional',
          includeHashtags: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate caption')
      }

      const data = await response.json()
      setCaption(data.caption)
    } catch (error) {
      console.error('Caption generation error:', error)
      alert('Failed to generate caption. Please try again.')
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    if (selectedMedia.length === 0) {
      alert('Please select at least one image')
      return
    }

    if (!caption.trim()) {
      alert('Please add a caption')
      return
    }

    setPublishing(true)

    try {
      // Create publish record
      const createResponse = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          caption,
          mediaIds: selectedMedia,
          scheduledFor: scheduledFor?.toISOString(),
        }),
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create publish record')
      }

      const { publishRecord } = await createResponse.json()

      // If not scheduled, publish immediately
      if (!scheduledFor) {
        const executeResponse = await fetch(`/api/publish/${publishRecord.id}/execute`, {
          method: 'POST',
        })

        if (!executeResponse.ok) {
          throw new Error('Failed to publish')
        }
      }

      // Reset form
      setSelectedPlatforms([])
      setSelectedMedia([])
      setCaption('')
      setScheduledFor(null)

      alert(scheduledFor ? 'Post scheduled successfully!' : 'Published successfully!')
    } catch (error) {
      console.error('Publish error:', error)
      alert('Failed to publish. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Media Selection */}
      <div className="lg:col-span-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Select Media</h2>
          <p className="text-sm text-gray-600">Choose images or videos to share</p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {availableMedia.map(media => (
              <button
                key={media.id}
                onClick={() => toggleMedia(media.id)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  selectedMedia.includes(media.id)
                    ? 'border-blue-600 ring-2 ring-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={media.variants.thumb?.url || media.variants.original.url}
                  alt={media.altText || 'Media'}
                  fill
                  className="object-cover"
                />
                {selectedMedia.includes(media.id) && (
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-20">
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                      ✓
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {availableMedia.length === 0 && (
            <p className="mt-4 text-center text-gray-500">
              No media available. Upload images in the Media Library first.
            </p>
          )}
        </div>

        {/* Caption Editor */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Caption</h2>
            <button
              onClick={handleGenerateCaption}
              disabled={generatingCaption || selectedMedia.length === 0}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generatingCaption ? 'Generating...' : 'AI Generate'}
            </button>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption here..."
            rows={6}
            className="mt-4 w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mt-2 text-right text-sm text-gray-500">
            {caption.length} characters
          </div>
        </div>
      </div>

      {/* Right Column - Platform Selection & Publish */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-6">
          {/* Platform Selection */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Platforms</h2>
            <p className="text-sm text-gray-600">Where to publish</p>

            <div className="mt-4 space-y-2">
              {connectedPlatforms.map(platform => {
                const config = platformConfig[platform]
                const Icon = config.icon
                const isSelected = selectedPlatforms.includes(platform)

                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-gray-900">{config.name}</span>
                    {isSelected && (
                      <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}

              {connectedPlatforms.length === 0 && (
                <p className="text-sm text-gray-500">
                  No platforms connected.{' '}
                  <a href="/dashboard/connections/social" className="text-blue-600 hover:underline">
                    Connect accounts
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            <p className="text-sm text-gray-600">Publish now or schedule for later</p>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduledFor !== null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(9, 0, 0, 0)
                      setScheduledFor(tomorrow)
                    } else {
                      setScheduledFor(null)
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Schedule for later</span>
              </label>

              {scheduledFor && (
                <input
                  type="datetime-local"
                  value={scheduledFor.toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledFor(new Date(e.target.value))}
                  className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={
              publishing ||
              selectedPlatforms.length === 0 ||
              selectedMedia.length === 0 ||
              !caption.trim()
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scheduledFor ? (
              <>
                <Calendar className="h-5 w-5" />
                {publishing ? 'Scheduling...' : 'Schedule Post'}
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {publishing ? 'Publishing...' : 'Publish Now'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
