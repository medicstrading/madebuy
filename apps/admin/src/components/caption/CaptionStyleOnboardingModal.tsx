'use client'

import type {
  CallToActionStyle,
  CaptionStyleOptions,
  CaptionTone,
  EmojiUsage,
  HashtagStyle,
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
  Check,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  MessageSquare,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from 'lucide-react'
import { useState } from 'react'

interface CaptionStyleOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (style: CaptionStyleOptions, examples: string[]) => void
  platform: SocialPlatform
}

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  'website-blog': 'Website Blog',
}

const PLATFORM_ICONS: Record<
  SocialPlatform,
  React.ComponentType<{ className?: string }>
> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: () => <span className="text-lg">🎵</span>,
  pinterest: () => <span className="text-lg">📌</span>,
  youtube: Youtube,
  'website-blog': () => <span className="text-lg">📝</span>,
}

type Step = 'welcome' | 'examples' | 'style' | 'review'

const STEPS: Step[] = ['welcome', 'examples', 'style', 'review']

export function CaptionStyleOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  platform,
}: CaptionStyleOnboardingModalProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [examples, setExamples] = useState<string[]>(['', '', ''])
  const [style, setStyle] = useState<CaptionStyleOptions>(
    PLATFORM_DEFAULT_STYLES[platform],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const PlatformIcon = PLATFORM_ICONS[platform]
  const platformName = PLATFORM_NAMES[platform]
  const currentStepIndex = STEPS.indexOf(step)

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex])
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    const validExamples = examples.filter((e) => e.trim().length > 0)
    await onComplete(style, validExamples)
    setIsSubmitting(false)
  }

  const addExample = () => {
    if (examples.length < 5) {
      setExamples([...examples, ''])
    }
  }

  const removeExample = (index: number) => {
    if (examples.length > 1) {
      setExamples(examples.filter((_, i) => i !== index))
    }
  }

  const updateExample = (index: number, value: string) => {
    const updated = [...examples]
    updated[index] = value
    setExamples(updated)
  }

  const toggleTone = (tone: CaptionTone) => {
    const current = style.tones
    if (current.includes(tone)) {
      setStyle({ ...style, tones: current.filter((t) => t !== tone) })
    } else {
      setStyle({ ...style, tones: [...current, tone] })
    }
  }

  const validExampleCount = examples.filter((e) => e.trim().length > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Set Up AI Captions for {platformName}
              </h2>
              <p className="text-sm text-gray-500">
                Step {currentStepIndex + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <PlatformIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Teach AI Your {platformName} Style
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                We&apos;ll learn how you like to write captions so every
                AI-generated caption matches your unique voice and style.
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm max-w-md mx-auto">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-gray-600">Share examples</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Settings2 className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-gray-600">Set preferences</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-gray-600">Get styled captions</p>
                </div>
              </div>
            </div>
          )}

          {/* Examples Step */}
          {step === 'examples' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share Your Caption Style
              </h3>
              <p className="text-gray-600 mb-4">
                Paste 3-5 captions you&apos;ve written before or ones you love.
                These help AI learn your voice.
              </p>

              <div className="space-y-3">
                {examples.map((example, index) => (
                  <div key={index} className="relative">
                    <textarea
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      placeholder={`Example caption ${index + 1}...`}
                      className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                    />
                    {examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {examples.length < 5 && (
                <button
                  type="button"
                  onClick={addExample}
                  className="mt-3 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add another example
                </button>
              )}

              <p className="mt-4 text-sm text-gray-500">
                {validExampleCount} of 3-5 examples added
              </p>
            </div>
          )}

          {/* Style Step */}
          {step === 'style' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Set Your Preferences
              </h3>

              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone (select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TONE_LABELS) as CaptionTone[]).map((tone) => (
                    <button
                      type="button"
                      key={tone}
                      onClick={() => toggleTone(tone)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        style.tones.includes(tone)
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {TONE_LABELS[tone]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Usage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji Usage
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(EMOJI_USAGE_LABELS) as EmojiUsage[]).map(
                    (usage) => (
                      <button
                        type="button"
                        key={usage}
                        onClick={() =>
                          setStyle({ ...style, emojiUsage: usage })
                        }
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          style.emojiUsage === usage
                            ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {EMOJI_USAGE_LABELS[usage]}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LENGTH_LABELS) as LengthPreference[]).map(
                    (length) => (
                      <button
                        type="button"
                        key={length}
                        onClick={() =>
                          setStyle({ ...style, lengthPreference: length })
                        }
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          style.lengthPreference === length
                            ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {LENGTH_LABELS[length]}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hashtag Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(HASHTAG_LABELS) as HashtagStyle[]).map((hs) => (
                    <button
                      type="button"
                      key={hs}
                      onClick={() => setStyle({ ...style, hashtagStyle: hs })}
                      className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        style.hashtagStyle === hs
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {HASHTAG_LABELS[hs]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call to Action */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={style.includeCallToAction}
                    onChange={(e) =>
                      setStyle({
                        ...style,
                        includeCallToAction: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include call-to-action
                  </span>
                </label>
                {style.includeCallToAction && (
                  <div className="grid grid-cols-3 gap-2 ml-6">
                    {(Object.keys(CTA_LABELS) as CallToActionStyle[]).map(
                      (cta) => (
                        <button
                          type="button"
                          key={cta}
                          onClick={() =>
                            setStyle({ ...style, callToActionStyle: cta })
                          }
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            style.callToActionStyle === cta
                              ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {CTA_LABELS[cta]}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review Your Settings
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Example Posts
                  </h4>
                  <p className="text-sm text-gray-600">
                    {validExampleCount} examples provided
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Style Settings
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="text-gray-500">Tone:</span>{' '}
                      {style.tones.map((t) => TONE_LABELS[t]).join(', ') ||
                        'None selected'}
                    </p>
                    <p>
                      <span className="text-gray-500">Emojis:</span>{' '}
                      {EMOJI_USAGE_LABELS[style.emojiUsage]}
                    </p>
                    <p>
                      <span className="text-gray-500">Length:</span>{' '}
                      {LENGTH_LABELS[style.lengthPreference]}
                    </p>
                    <p>
                      <span className="text-gray-500">Hashtags:</span>{' '}
                      {HASHTAG_LABELS[style.hashtagStyle]}
                    </p>
                    <p>
                      <span className="text-gray-500">Call-to-action:</span>{' '}
                      {style.includeCallToAction
                        ? style.callToActionStyle
                          ? CTA_LABELS[style.callToActionStyle]
                          : 'Yes'
                        : 'No'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900">
                        Auto-Learning Enabled
                      </h4>
                      <p className="text-sm text-purple-700">
                        AI will learn from your successfully published posts to
                        improve over time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step === 'review' ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
