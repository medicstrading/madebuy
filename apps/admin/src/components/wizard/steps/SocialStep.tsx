'use client'

import type { MediaItem, SocialPlatform } from '@madebuy/shared'
import {
  ArrowLeft,
  Calendar,
  Facebook,
  Instagram,
  Loader2,
  Send,
  Sparkles,
  Youtube,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FeatureGate, FeatureLockBadge } from '../FeatureGate'

interface SocialStepProps {
  pieceId: string
  pieceName: string
  pieceDescription: string
  mediaItems: MediaItem[]
  connectedPlatforms: SocialPlatform[]
  currentPlan: string
  initialData: {
    platforms: SocialPlatform[]
    caption: string
    scheduleTime: Date | null
    selectedMediaIds: string[]
  }
  onSave: (data: {
    platforms: SocialPlatform[]
    caption: string
    scheduleTime: Date | null
    selectedMediaIds: string[]
  }) => void
  onBack: () => void
  onSkip: () => void
  loading: boolean
}

const PLATFORM_CONFIG: Record<
  string,
  {
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
> = {
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  tiktok: {
    name: 'TikTok',
    icon: () => <span className="text-lg">🎵</span>,
    color: 'text-black',
  },
  pinterest: {
    name: 'Pinterest',
    icon: () => <span className="text-lg">📌</span>,
    color: 'text-red-600',
  },
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-600' },
}

export function SocialStep({
  pieceId,
  pieceName,
  pieceDescription,
  mediaItems,
  connectedPlatforms,
  currentPlan,
  initialData,
  onSave,
  onBack,
  onSkip,
  loading,
}: SocialStepProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    initialData.platforms,
  )
  const [caption, setCaption] = useState(initialData.caption)
  const [scheduleTime, setScheduleTime] = useState<Date | null>(
    initialData.scheduleTime,
  )
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>(
    initialData.selectedMediaIds.length > 0
      ? initialData.selectedMediaIds
      : mediaItems.slice(0, 1).map((m) => m.id),
  )
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [isScheduled, setIsScheduled] = useState(
    initialData.scheduleTime !== null,
  )

  // Check feature access
  const hasSocialAccess = [
    'maker',
    'professional',
    'studio',
    'pro',
    'business',
  ].includes(currentPlan)
  const hasAiCaptions = ['professional', 'studio', 'pro', 'business'].includes(
    currentPlan,
  )

  // Filter to only social platforms (exclude blog)
  const socialPlatforms = connectedPlatforms.filter((p) => p !== 'website-blog')

  // Auto-generate caption on mount if empty and has access
  useEffect(() => {
    if (
      !caption &&
      hasSocialAccess &&
      hasAiCaptions &&
      selectedMediaIds.length > 0
    ) {
      generateCaption()
    }
  }, [
    caption,
    generateCaption,
    hasAiCaptions,
    hasSocialAccess,
    selectedMediaIds.length,
  ])

  const generateCaption = async () => {
    setGeneratingCaption(true)
    try {
      const response = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieceId,
          mediaIds: selectedMediaIds,
          platform: selectedPlatforms[0],
          includeHashtags: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCaption(data.caption)
      }
    } catch (error) {
      console.error('Failed to generate caption:', error)
    } finally {
      setGeneratingCaption(false)
    }
  }

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    )
  }

  const toggleMedia = (mediaId: string) => {
    setSelectedMediaIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId],
    )
  }

  const handleSubmit = () => {
    onSave({
      platforms: selectedPlatforms,
      caption,
      scheduleTime: isScheduled ? scheduleTime : null,
      selectedMediaIds,
    })
  }

  // If no access, show upgrade prompt
  if (!hasSocialAccess) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Announce your new item
          </h2>
          <p className="mt-2 text-gray-600">
            Share to social media with one click
          </p>
        </div>

        <FeatureGate
          feature="Social Publishing"
          requiredPlan="maker"
          currentPlan={currentPlan}
          teaserTitle="Announce to the World"
          teaserDescription="Post to Instagram, Facebook, TikTok, and Pinterest directly from MadeBuy. Includes AI-generated captions that match your brand voice."
        ></FeatureGate>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            type="button"
            onClick={onSkip}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md transition-all"
          >
            Skip & Launch
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Announce your new item
        </h2>
        <p className="mt-2 text-gray-600">
          Share to social media with one click
        </p>
      </div>

      {/* Platform selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Select platforms
        </p>
        <div className="flex flex-wrap gap-2">
          {socialPlatforms.map((platform) => {
            const config = PLATFORM_CONFIG[platform]
            if (!config) return null
            const Icon = config.icon
            const isSelected = selectedPlatforms.includes(platform)

            return (
              <button
                type="button"
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${config.color}`} />
                <span className="font-medium text-gray-900">{config.name}</span>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {socialPlatforms.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No social accounts connected.{' '}
            <a
              href="/dashboard/connections"
              className="text-purple-600 hover:underline"
            >
              Connect accounts
            </a>
          </p>
        )}
      </div>

      {/* Caption */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Caption</label>
          <div className="flex items-center gap-2">
            {hasAiCaptions ? (
              <button
                type="button"
                type="button"
                onClick={generateCaption}
                disabled={generatingCaption || selectedMediaIds.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingCaption ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generatingCaption ? 'Generating...' : 'Regenerate'}
              </button>
            ) : (
              <span className="flex items-center text-xs text-gray-500">
                <FeatureLockBadge requiredPlan="pro" />
                <span className="ml-1">AI Captions</span>
              </span>
            )}
          </div>
        </div>

        {generatingCaption && !caption ? (
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
            <p className="mt-2 text-sm text-gray-600">Generating caption...</p>
          </div>
        ) : (
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption..."
            rows={4}
            className="w-full rounded-xl border-2 border-gray-200 p-4 focus:border-purple-500 focus:outline-none focus:ring-0 transition-colors resize-none"
          />
        )}
        <p className="mt-1 text-right text-xs text-gray-500">
          {caption.length} characters
        </p>
      </div>

      {/* Media selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Photos to include ({selectedMediaIds.length} selected)
        </p>
        <div className="grid grid-cols-6 gap-2">
          {mediaItems.map((media) => {
            const isSelected = selectedMediaIds.includes(media.id)
            return (
              <button
                type="button"
                key={media.id}
                type="button"
                onClick={() => toggleMedia(media.id)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={media.variants.thumb?.url || media.variants.original.url}
                  alt=""
                  fill
                  className="object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-purple-600 bg-opacity-20">
                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-xs">
                      ✓
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-gray-200 p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={(e) => {
              setIsScheduled(e.target.checked)
              if (e.target.checked && !scheduleTime) {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(10, 0, 0, 0)
                setScheduleTime(tomorrow)
              }
            }}
            className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <div>
            <span className="font-medium text-gray-900">
              Schedule for later
            </span>
            <p className="text-sm text-gray-500">
              Post at the best time for engagement
            </p>
          </div>
        </label>

        {isScheduled && (
          <div className="mt-4">
            <input
              type="datetime-local"
              value={scheduleTime?.toISOString().slice(0, 16) || ''}
              onChange={(e) => setScheduleTime(new Date(e.target.value))}
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip social
          </button>
          <button
            type="button"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publishing...
              </>
            ) : isScheduled ? (
              <>
                <Calendar className="h-5 w-5" />
                Schedule & Launch
              </>
            ) : selectedPlatforms.length > 0 ? (
              <>
                <Send className="h-5 w-5" />
                Launch!
              </>
            ) : (
              'Launch!'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
