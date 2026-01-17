'use client'

import type {
  CallToActionStyle,
  CaptionStyleOptions,
  CaptionStyleProfile,
  CaptionTone,
  EmojiUsage,
  ExamplePost,
  HashtagStyle,
  LearnedExample,
  LengthPreference,
  SocialPlatform,
} from '@madebuy/shared'
import {
  CTA_LABELS,
  EMOJI_USAGE_LABELS,
  HASHTAG_LABELS,
  LENGTH_LABELS,
  PLATFORM_DEFAULT_STYLES,
  TONE_LABELS,
} from '@madebuy/shared'
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Facebook,
  GraduationCap,
  Instagram,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Platform display config
const PLATFORM_CONFIG: Record<
  SocialPlatform,
  {
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600 bg-pink-50',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600 bg-blue-50',
  },
  tiktok: { name: 'TikTok', icon: Sparkles, color: 'text-black bg-gray-100' },
  pinterest: {
    name: 'Pinterest',
    icon: Sparkles,
    color: 'text-red-600 bg-red-50',
  },
  youtube: { name: 'YouTube', icon: Sparkles, color: 'text-red-600 bg-red-50' },
  'website-blog': {
    name: 'Website/Blog',
    icon: Sparkles,
    color: 'text-gray-600 bg-gray-100',
  },
}

const PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'pinterest',
  'youtube',
  'website-blog',
]

export default function CaptionStyleSettingsPage() {
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform>('instagram')
  const [profile, setProfile] = useState<CaptionStyleProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'examples' | 'style' | 'learned'>(
    'examples',
  )

  // New example input
  const [newExample, setNewExample] = useState('')
  const [isAddingExample, setIsAddingExample] = useState(false)

  // Style options being edited
  const [styleOptions, setStyleOptions] = useState<CaptionStyleOptions>(
    PLATFORM_DEFAULT_STYLES.instagram,
  )

  // Fetch profile for selected platform
  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/caption-styles/${selectedPlatform}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        if (data.profile?.style) {
          setStyleOptions(data.profile.style)
        } else {
          setStyleOptions(PLATFORM_DEFAULT_STYLES[selectedPlatform])
        }
      } else if (res.status === 404) {
        // No profile yet - use defaults
        setProfile(null)
        setStyleOptions(PLATFORM_DEFAULT_STYLES[selectedPlatform])
      } else {
        throw new Error('Failed to fetch profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Failed to load style profile' })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPlatform])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Save style options
  const handleSaveStyle = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const method = profile ? 'PATCH' : 'POST'
      const res = await fetch(`/api/caption-styles/${selectedPlatform}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: styleOptions }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setMessage({ type: 'success', text: 'Style settings saved!' })
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save style',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add example post
  const handleAddExample = async () => {
    if (!newExample.trim()) return

    setIsAddingExample(true)
    setMessage(null)

    try {
      const res = await fetch(
        `/api/caption-styles/${selectedPlatform}/examples`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newExample.trim() }),
        },
      )

      if (res.ok) {
        setNewExample('')
        await fetchProfile()
        setMessage({ type: 'success', text: 'Example added!' })
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add example')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add example',
      })
    } finally {
      setIsAddingExample(false)
    }
  }

  // Remove example post
  const handleRemoveExample = async (exampleId: string) => {
    try {
      const res = await fetch(
        `/api/caption-styles/${selectedPlatform}/examples`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exampleId }),
        },
      )

      if (res.ok) {
        await fetchProfile()
        setMessage({ type: 'success', text: 'Example removed' })
      } else {
        throw new Error('Failed to remove example')
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Failed to remove example' })
    }
  }

  // Toggle tone selection
  const handleToneToggle = (tone: CaptionTone) => {
    setStyleOptions((prev) => ({
      ...prev,
      tones: prev.tones.includes(tone)
        ? prev.tones.filter((t) => t !== tone)
        : [...prev.tones, tone],
    }))
  }

  const platformConfig = PLATFORM_CONFIG[selectedPlatform]
  const PlatformIcon = platformConfig.icon

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Caption Style Settings
        </h1>
        <p className="mt-1 text-gray-600">
          Customize how AI generates captions for each platform
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Platform Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => {
            const config = PLATFORM_CONFIG[platform]
            const Icon = config.icon
            const isSelected = platform === selectedPlatform

            return (
              <button
                type="button"
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                <Icon className="h-4 w-4" />
                {config.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-lg bg-white shadow">
        {/* Header with platform info */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  platformConfig.color,
                )}
              >
                <PlatformIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {platformConfig.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {profile?.onboardingComplete
                    ? `${profile.examplePosts.length} examples, ${profile.learnedExamples.length} learned`
                    : 'Not configured yet'}
                </p>
              </div>
            </div>
            {profile?.onboardingComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle className="h-3 w-3" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            {[
              { id: 'examples' as const, label: 'Examples', icon: BookOpen },
              { id: 'style' as const, label: 'Style Options', icon: Settings2 },
              { id: 'learned' as const, label: 'Learned', icon: GraduationCap },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'examples' && (
            <ExamplesTab
              examples={profile?.examplePosts || []}
              newExample={newExample}
              setNewExample={setNewExample}
              onAdd={handleAddExample}
              onRemove={handleRemoveExample}
              isAdding={isAddingExample}
            />
          )}

          {activeTab === 'style' && (
            <StyleOptionsTab
              options={styleOptions}
              onToneToggle={handleToneToggle}
              onOptionChange={(key, value) =>
                setStyleOptions((prev) => ({ ...prev, [key]: value }))
              }
              onSave={handleSaveStyle}
              isSaving={isSaving}
            />
          )}

          {activeTab === 'learned' && (
            <LearnedTab examples={profile?.learnedExamples || []} />
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-800">
          How Caption Learning Works
        </h4>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Add 3-5 example posts that represent your style</li>
          <li>Adjust style options to fine-tune output</li>
          <li>AI learns from your successfully published posts over time</li>
          <li>Each platform can have its own unique style</li>
        </ul>
      </div>
    </div>
  )
}

// Examples Tab Component
function ExamplesTab({
  examples,
  newExample,
  setNewExample,
  onAdd,
  onRemove,
  isAdding,
}: {
  examples: ExamplePost[]
  newExample: string
  setNewExample: (v: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  isAdding: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Your Example Posts
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Paste examples of captions you&apos;ve written that represent your
          style. These help AI understand your voice.
        </p>

        {/* Add new example */}
        <div className="mb-4">
          <textarea
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            placeholder="Paste an example caption here..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={4}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {examples.length}/10 examples (3-5 recommended)
            </span>
            <button
              type="button"
              onClick={onAdd}
              disabled={isAdding || !newExample.trim() || examples.length >= 10}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Example
            </button>
          </div>
        </div>

        {/* Existing examples */}
        <div className="space-y-3">
          {examples.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No examples yet. Add some to get started!
              </p>
            </div>
          ) : (
            examples.map((example) => (
              <div
                key={example.id}
                className="group relative rounded-lg border border-gray-200 p-4 hover:border-gray-300"
              >
                <p className="text-sm text-gray-700 whitespace-pre-wrap pr-8">
                  {example.content}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <span>
                    {example.source === 'user' ? 'Added manually' : 'Imported'}
                  </span>
                  <span>&bull;</span>
                  <span>{new Date(example.addedAt).toLocaleDateString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(example.id)}
                  className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Style Options Tab Component
function StyleOptionsTab({
  options,
  onToneToggle,
  onOptionChange,
  onSave,
  isSaving,
}: {
  options: CaptionStyleOptions
  onToneToggle: (tone: CaptionTone) => void
  onOptionChange: (key: keyof CaptionStyleOptions, value: unknown) => void
  onSave: () => void
  isSaving: boolean
}) {
  const tones: CaptionTone[] = [
    'professional',
    'casual',
    'playful',
    'luxurious',
    'authentic',
    'educational',
    'inspirational',
    'conversational',
  ]
  const emojiOptions: EmojiUsage[] = ['none', 'minimal', 'moderate', 'heavy']
  const lengthOptions: LengthPreference[] = ['short', 'medium', 'long']
  const hashtagOptions: HashtagStyle[] = [
    'none',
    'minimal',
    'moderate',
    'heavy',
  ]
  const ctaOptions: CallToActionStyle[] = ['subtle', 'direct', 'question']

  return (
    <div className="space-y-8">
      {/* Tones */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Voice & Tone</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select the tones that best describe your brand voice (pick 1-3)
        </p>
        <div className="flex flex-wrap gap-2">
          {tones.map((tone) => (
            <button
              type="button"
              key={tone}
              onClick={() => onToneToggle(tone)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                options.tones.includes(tone)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {TONE_LABELS[tone]}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji Usage */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Emoji Usage</h3>
        <div className="flex flex-wrap gap-2">
          {emojiOptions.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onOptionChange('emojiUsage', opt)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                options.emojiUsage === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {EMOJI_USAGE_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Caption Length
        </h3>
        <div className="flex flex-wrap gap-2">
          {lengthOptions.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onOptionChange('lengthPreference', opt)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                options.lengthPreference === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {LENGTH_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Hashtags */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Hashtag Style
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {hashtagOptions.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onOptionChange('hashtagStyle', opt)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                options.hashtagStyle === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {HASHTAG_LABELS[opt]}
            </button>
          ))}
        </div>
        {options.hashtagStyle !== 'none' && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Position:</span>
            <button
              type="button"
              onClick={() => onOptionChange('hashtagPosition', 'inline')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                options.hashtagPosition === 'inline'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              Inline
            </button>
            <button
              type="button"
              onClick={() => onOptionChange('hashtagPosition', 'end')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                options.hashtagPosition === 'end'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              At End
            </button>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Call to Action
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeCallToAction}
              onChange={(e) =>
                onOptionChange('includeCallToAction', e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Include call-to-action
            </span>
          </label>
        </div>
        {options.includeCallToAction && (
          <div className="flex flex-wrap gap-2">
            {ctaOptions.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => onOptionChange('callToActionStyle', opt)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  options.callToActionStyle === opt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
              >
                {CTA_LABELS[opt]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Instructions */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Custom Instructions
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Any additional guidelines for the AI (optional)
        </p>
        <textarea
          value={options.customInstructions || ''}
          onChange={(e) => onOptionChange('customInstructions', e.target.value)}
          placeholder="e.g., Always mention our handmade process, Avoid using the word 'just'..."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* Save Button */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Style Settings'
          )}
        </button>
      </div>
    </div>
  )
}

// Learned Examples Tab Component
function LearnedTab({ examples }: { examples: LearnedExample[] }) {
  if (examples.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          No learned examples yet
        </h3>
        <p className="text-sm">
          As you publish posts, the AI will automatically learn from your
          successful captions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Auto-Learned Examples
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          These captions were learned from your successfully published posts.
          The AI uses these to improve future generations.
        </p>
      </div>

      <div className="space-y-3">
        {examples.map((example) => (
          <div
            key={example.id}
            className="rounded-lg border border-gray-200 p-4 bg-gray-50"
          >
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {example.content}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <span>
                Learned {new Date(example.learnedAt).toLocaleDateString()}
              </span>
              {example.metrics && (
                <>
                  {example.metrics.likes && (
                    <span>{example.metrics.likes} likes</span>
                  )}
                  {example.metrics.comments && (
                    <span>{example.metrics.comments} comments</span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
