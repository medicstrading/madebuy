'use client'

import { useState, useEffect } from 'react'
import type { SocialPlatform, MediaItem, BlogPublishConfig, CaptionStyleOptions } from '@madebuy/shared'
import { Instagram, Facebook, Youtube, Sparkles, Send, Calendar, FileText, Settings2 } from 'lucide-react'
import Image from 'next/image'
import { CaptionStyleOnboardingModal } from '../caption/CaptionStyleOnboardingModal'

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
  'website-blog': { name: 'Website Blog', icon: FileText, color: 'text-gray-700' },
}

export function PublishComposer({ tenantId, connectedPlatforms, availableMedia }: PublishComposerProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
  const [selectedMedia, setSelectedMedia] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null)

  // Caption style onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingPlatform, setOnboardingPlatform] = useState<SocialPlatform | null>(null)
  const [platformStyleStatus, setPlatformStyleStatus] = useState<Record<SocialPlatform, boolean>>({} as Record<SocialPlatform, boolean>)
  const [captionPlatform, setCaptionPlatform] = useState<SocialPlatform | null>(null)

  // Blog-specific fields
  const [blogTitle, setBlogTitle] = useState('')
  const [blogExcerpt, setBlogExcerpt] = useState('')
  const [blogTags, setBlogTags] = useState<string[]>([])
  const [blogTagInput, setBlogTagInput] = useState('')
  const [blogMetaTitle, setBlogMetaTitle] = useState('')
  const [blogMetaDescription, setBlogMetaDescription] = useState('')

  const isBlogSelected = selectedPlatforms.includes('website-blog')

  // Check style profile status for connected platforms
  useEffect(() => {
    const checkStyleProfiles = async () => {
      const statuses: Record<SocialPlatform, boolean> = {} as Record<SocialPlatform, boolean>
      for (const platform of connectedPlatforms) {
        try {
          const response = await fetch(`/api/caption-styles/${platform}`)
          if (response.ok) {
            const data = await response.json()
            statuses[platform] = data.exists && data.profile?.onboardingComplete
          }
        } catch {
          statuses[platform] = false
        }
      }
      setPlatformStyleStatus(statuses)
    }
    checkStyleProfiles()
  }, [connectedPlatforms])

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

    // Determine which platform to use for caption style
    const targetPlatform = captionPlatform || selectedPlatforms[0] || connectedPlatforms[0]

    // Check if style profile exists for this platform
    if (targetPlatform && !platformStyleStatus[targetPlatform]) {
      // Show onboarding modal
      setOnboardingPlatform(targetPlatform)
      setShowOnboarding(true)
      return
    }

    await generateCaptionForPlatform(targetPlatform)
  }

  const generateCaptionForPlatform = async (platform?: SocialPlatform) => {
    setGeneratingCaption(true)

    try {
      const response = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: selectedMedia,
          platform,
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

  const handleOnboardingComplete = async (style: CaptionStyleOptions, examples: string[]) => {
    if (!onboardingPlatform) return

    try {
      // Create style profile
      const createResponse = await fetch(`/api/caption-styles/${onboardingPlatform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, examplePosts: examples }),
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create style profile')
      }

      // Mark onboarding complete
      await fetch(`/api/caption-styles/${onboardingPlatform}/complete`, {
        method: 'POST',
      })

      // Update local state
      setPlatformStyleStatus(prev => ({
        ...prev,
        [onboardingPlatform]: true,
      }))

      setShowOnboarding(false)

      // Generate caption with new profile
      await generateCaptionForPlatform(onboardingPlatform)
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('Failed to save style preferences. Please try again.')
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

    // Validate blog fields if blog is selected
    if (isBlogSelected) {
      if (!blogTitle.trim()) {
        alert('Please enter a blog title')
        return
      }
    }

    setPublishing(true)

    try {
      // Prepare blog config if blog is selected
      const blogConfig: BlogPublishConfig | undefined = isBlogSelected
        ? {
            title: blogTitle,
            excerpt: blogExcerpt,
            tags: blogTags,
            metaTitle: blogMetaTitle,
            metaDescription: blogMetaDescription,
          }
        : undefined

      // Create publish record
      const createResponse = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          caption,
          mediaIds: selectedMedia,
          scheduledFor: scheduledFor?.toISOString(),
          blogConfig,
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
      setCaptionPlatform(null)

      // Reset blog fields
      setBlogTitle('')
      setBlogExcerpt('')
      setBlogTags([])
      setBlogTagInput('')
      setBlogMetaTitle('')
      setBlogMetaDescription('')

      alert(scheduledFor ? 'Post scheduled successfully!' : 'Published successfully!')
    } catch (error) {
      console.error('Publish error:', error)
      alert('Failed to publish. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  // Get social platforms (excluding blog)
  const socialPlatforms = connectedPlatforms.filter(p => p !== 'website-blog')

  return (
    <>
      {/* Onboarding Modal */}
      {onboardingPlatform && (
        <CaptionStyleOnboardingModal
          isOpen={showOnboarding}
          onClose={() => {
            setShowOnboarding(false)
            setOnboardingPlatform(null)
          }}
          onComplete={handleOnboardingComplete}
          platform={onboardingPlatform}
        />
      )}

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
              <div className="flex items-center gap-2">
                {/* Platform selector for caption style */}
                {socialPlatforms.length > 1 && (
                  <select
                    value={captionPlatform || ''}
                    onChange={(e) => setCaptionPlatform(e.target.value as SocialPlatform || null)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Auto-detect style</option>
                    {socialPlatforms.map(platform => (
                      <option key={platform} value={platform}>
                        {platformConfig[platform].name} style
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption || selectedMedia.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingCaption ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
            </div>

            {/* Style status indicator */}
            {(captionPlatform || selectedPlatforms[0]) && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                {platformStyleStatus[captionPlatform || selectedPlatforms[0]] ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Style profile active
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    No style profile - will set up on first generate
                  </span>
                )}
                <a
                  href="/dashboard/settings/caption-style"
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" />
                  Edit styles
                </a>
              </div>
            )}

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

          {/* Blog Fields (only show if blog is selected) */}
          {isBlogSelected && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Blog Settings</h2>
              </div>

              <div className="space-y-4">
                {/* Blog Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blog Title *
                  </label>
                  <input
                    type="text"
                    value={blogTitle}
                    onChange={(e) => setBlogTitle(e.target.value)}
                    placeholder="Enter blog post title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Blog Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excerpt
                  </label>
                  <textarea
                    value={blogExcerpt}
                    onChange={(e) => setBlogExcerpt(e.target.value)}
                    placeholder="Brief description (150-300 characters)..."
                    rows={2}
                    maxLength={300}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {blogExcerpt.length}/300 characters
                  </p>
                </div>

                {/* Blog Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={blogTagInput}
                      onChange={(e) => setBlogTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const tag = blogTagInput.trim()
                          if (tag && !blogTags.includes(tag)) {
                            setBlogTags([...blogTags, tag])
                            setBlogTagInput('')
                          }
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tag = blogTagInput.trim()
                        if (tag && !blogTags.includes(tag)) {
                          setBlogTags([...blogTags, tag])
                          setBlogTagInput('')
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blogTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setBlogTags(blogTags.filter(t => t !== tag))}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SEO Fields (collapsible) */}
                <details className="border-t border-gray-200 pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    SEO Settings (Optional)
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        value={blogMetaTitle}
                        onChange={(e) => setBlogMetaTitle(e.target.value)}
                        placeholder="Leave empty to use blog title..."
                        maxLength={60}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {(blogMetaTitle || blogTitle).length}/60 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Description
                      </label>
                      <textarea
                        value={blogMetaDescription}
                        onChange={(e) => setBlogMetaDescription(e.target.value)}
                        placeholder="Brief description for search engines..."
                        rows={2}
                        maxLength={160}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {blogMetaDescription.length}/160 characters
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}
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
                  const hasStyle = platformStyleStatus[platform]

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
                      {platform !== 'website-blog' && (
                        <span
                          className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                            hasStyle
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {hasStyle ? 'Styled' : 'Default'}
                        </span>
                      )}
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
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
    </>
  )
}
