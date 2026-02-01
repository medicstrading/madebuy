'use client'

import {
  type FAQItem,
  type FeatureItem,
  type PageSection,
  type PageSectionSettings,
  type TestimonialItem,
} from '@madebuy/shared'
import { Check, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

interface SectionContentFormProps {
  section: PageSection
  onChange: (section: PageSection) => void
}

interface ImageUploaderProps {
  label: string
  value?: string
  onChange: (mediaId: string, url: string) => void
  hint?: string
}

function ImageUploader({ label, value, onChange, hint }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const media = await response.json()
        onChange(media.id, media.variants.original.url)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <label className="block cursor-pointer">
        <div
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            value
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
          }`}
        >
          {isUploading ? (
            <div className="py-4">
              <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Uploading...</p>
            </div>
          ) : value ? (
            <div className="relative">
              <img
                src={value}
                alt=""
                className="max-h-32 mx-auto rounded-lg object-cover"
              />
              <p className="text-sm text-gray-500 mt-2">Click to replace</p>
            </div>
          ) : (
            <div className="py-4">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 mt-2">
                Click to upload image
              </p>
              {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </label>
    </div>
  )
}

export function SectionContentForm({
  section,
  onChange,
}: SectionContentFormProps) {
  const settings = section.settings || {}

  const updateSettings = (updates: Partial<PageSectionSettings>) => {
    onChange({
      ...section,
      settings: {
        ...section.settings,
        ...updates,
      },
    })
  }

  const markComplete = () => {
    updateSettings({ isContentComplete: true })
  }

  // Render different forms based on section type
  switch (section.type) {
    case 'hero-slider':
    case 'hero-simple':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Headline
            </label>
            <input
              type="text"
              value={settings.headline || ''}
              onChange={(e) => updateSettings({ headline: e.target.value })}
              placeholder="Welcome to Our Store"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subheadline
            </label>
            <input
              type="text"
              value={settings.subheadline || ''}
              onChange={(e) => updateSettings({ subheadline: e.target.value })}
              placeholder="Handcrafted with love"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={settings.buttonText || ''}
                onChange={(e) => updateSettings({ buttonText: e.target.value })}
                placeholder="Shop Now"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Link
              </label>
              <input
                type="text"
                value={settings.buttonUrl || ''}
                onChange={(e) => updateSettings({ buttonUrl: e.target.value })}
                placeholder="/shop"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
          </div>

          <ImageUploader
            label="Background Image"
            value={settings.backgroundImageUrl}
            onChange={(id, url) =>
              updateSettings({ backgroundMediaId: id, backgroundImageUrl: url })
            }
            hint="Recommended: 1920x600px"
          />

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'feature-cards': {
      const features: FeatureItem[] = settings.features || [
        { id: '1', title: '', description: '' },
        { id: '2', title: '', description: '' },
        { id: '3', title: '', description: '' },
      ]

      const updateFeature = (
        index: number,
        field: keyof FeatureItem,
        value: string,
      ) => {
        const newFeatures = features.map((f, i) =>
          i === index ? { ...f, [field]: value } : f,
        )
        updateSettings({ features: newFeatures })
      }

      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Why Choose Us"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Feature Cards
            </label>
            {features.map((feature, index) => (
              <div
                key={feature.id || index}
                className="p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Card {index + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) =>
                    updateFeature(index, 'title', e.target.value)
                  }
                  placeholder="Feature Title"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm"
                />
                <textarea
                  value={feature.description}
                  onChange={(e) =>
                    updateFeature(index, 'description', e.target.value)
                  }
                  placeholder="Feature description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm resize-none"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )
    }

    case 'testimonials': {
      const testimonials: TestimonialItem[] = settings.testimonials || [
        { id: '1', name: '', content: '' },
        { id: '2', name: '', content: '' },
        { id: '3', name: '', content: '' },
      ]

      const updateTestimonial = (
        index: number,
        field: keyof TestimonialItem,
        value: string | number,
      ) => {
        const newTestimonials = testimonials.map((t, i) =>
          i === index ? { ...t, [field]: value } : t,
        )
        updateSettings({ testimonials: newTestimonials })
      }

      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="What Our Customers Say"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Testimonials
            </label>
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id || index}
                className="p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Testimonial {index + 1}
                  </span>
                </div>
                <input
                  type="text"
                  value={testimonial.name}
                  onChange={(e) =>
                    updateTestimonial(index, 'name', e.target.value)
                  }
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm"
                />
                <textarea
                  value={testimonial.content}
                  onChange={(e) =>
                    updateTestimonial(index, 'content', e.target.value)
                  }
                  placeholder="Customer testimonial..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm resize-none"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )
    }

    case 'about':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading
            </label>
            <input
              type="text"
              value={settings.heading || ''}
              onChange={(e) => updateSettings({ heading: e.target.value })}
              placeholder="Our Story"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Story
            </label>
            <textarea
              value={settings.storyText || settings.aboutContent || ''}
              onChange={(e) =>
                updateSettings({
                  storyText: e.target.value,
                  aboutContent: e.target.value,
                })
              }
              placeholder="Tell your story... What inspired you to start? What makes your products special?"
              rows={6}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
            />
          </div>

          <ImageUploader
            label="Photo"
            value={settings.photoUrl || settings.aboutImage}
            onChange={(id, url) =>
              updateSettings({
                photoMediaId: id,
                photoUrl: url,
                aboutImageMediaId: id,
                aboutImage: url,
              })
            }
            hint="A photo of you, your workspace, or your craft"
          />

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'faq': {
      const faqs: FAQItem[] = settings.faqs || [
        { id: '1', question: '', answer: '' },
        { id: '2', question: '', answer: '' },
      ]

      const updateFaq = (
        index: number,
        field: keyof FAQItem,
        value: string,
      ) => {
        const newFaqs = faqs.map((f, i) =>
          i === index ? { ...f, [field]: value } : f,
        )
        updateSettings({ faqs: newFaqs })
      }

      const addFaq = () => {
        updateSettings({
          faqs: [...faqs, { id: `${Date.now()}`, question: '', answer: '' }],
        })
      }

      const removeFaq = (index: number) => {
        if (faqs.length <= 1) return
        updateSettings({
          faqs: faqs.filter((_, i) => i !== index),
        })
      }

      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Frequently Asked Questions"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Questions & Answers
            </label>
            {faqs.map((faq, index) => (
              <div
                key={faq.id || index}
                className="p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Q&A {index + 1}
                  </span>
                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaq(index, 'question', e.target.value)}
                  placeholder="Question"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors text-sm resize-none"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addFaq}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )
    }

    case 'newsletter':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading
            </label>
            <input
              type="text"
              value={settings.heading || settings.newsletterTitle || ''}
              onChange={(e) =>
                updateSettings({
                  heading: e.target.value,
                  newsletterTitle: e.target.value,
                })
              }
              placeholder="Stay Updated"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={
                settings.description || settings.newsletterDescription || ''
              }
              onChange={(e) =>
                updateSettings({
                  description: e.target.value,
                  newsletterDescription: e.target.value,
                })
              }
              placeholder="Subscribe to get updates about new products and special offers."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={settings.buttonText || settings.newsletterButtonText || ''}
              onChange={(e) =>
                updateSettings({
                  buttonText: e.target.value,
                  newsletterButtonText: e.target.value,
                })
              }
              placeholder="Subscribe"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Headline
            </label>
            <input
              type="text"
              value={settings.headline || settings.ctaText || ''}
              onChange={(e) =>
                updateSettings({
                  headline: e.target.value,
                  ctaText: e.target.value,
                })
              }
              placeholder="Ready to Get Started?"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={settings.description || ''}
              onChange={(e) => updateSettings({ description: e.target.value })}
              placeholder="Take the next step..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={settings.buttonText || settings.ctaButtonText || ''}
                onChange={(e) =>
                  updateSettings({
                    buttonText: e.target.value,
                    ctaButtonText: e.target.value,
                  })
                }
                placeholder="Get Started"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Link
              </label>
              <input
                type="text"
                value={settings.buttonUrl || settings.ctaUrl || ''}
                onChange={(e) =>
                  updateSettings({
                    buttonUrl: e.target.value,
                    ctaUrl: e.target.value,
                  })
                }
                placeholder="/contact"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'product-grid':
    case 'product-featured':
    case 'collections':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder={
                section.type === 'collections'
                  ? 'Shop by Collection'
                  : 'Featured Products'
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle (optional)
            </label>
            <input
              type="text"
              value={settings.subtitle || ''}
              onChange={(e) => updateSettings({ subtitle: e.target.value })}
              placeholder="Browse our latest pieces"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Products will be automatically pulled from your inventory. Make
              sure you have products added to display them here.
            </p>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'blog-preview':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Latest from the Blog"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Blog posts will be automatically pulled from your blog. Visit the
              Blog section in the dashboard to add posts.
            </p>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'contact':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Get in Touch"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showContactForm ?? true}
                onChange={(e) =>
                  updateSettings({ showContactForm: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show contact form</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showEmail ?? true}
                onChange={(e) =>
                  updateSettings({ showEmail: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show email address</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPhone ?? false}
                onChange={(e) =>
                  updateSettings({ showPhone: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show phone number</span>
            </label>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-700">
              Contact info is pulled from your account settings. Update your
              details in Settings → Business Info.
            </p>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'gallery':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Gallery"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              Gallery images can be managed from the media library. This section
              will display your selected gallery images.
            </p>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'text-image':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Section Title"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={settings.content || ''}
              onChange={(e) => updateSettings({ content: e.target.value })}
              placeholder="Your content here..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
            />
          </div>

          <ImageUploader
            label="Image"
            value={settings.image}
            onChange={(id, url) =>
              updateSettings({ imageMediaId: id, image: url })
            }
          />

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'custom-order':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={settings.customOrderTitle || settings.title || ''}
              onChange={(e) =>
                updateSettings({
                  customOrderTitle: e.target.value,
                  title: e.target.value,
                })
              }
              placeholder="Custom Orders Welcome"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={
                settings.customOrderDescription || settings.description || ''
              }
              onChange={(e) =>
                updateSettings({
                  customOrderDescription: e.target.value,
                  description: e.target.value,
                })
              }
              placeholder="Looking for something special? We'd love to create a custom piece just for you..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={
                settings.customOrderButtonText || settings.buttonText || ''
              }
              onChange={(e) =>
                updateSettings({
                  customOrderButtonText: e.target.value,
                  buttonText: e.target.value,
                })
              }
              placeholder="Enquire Now"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'spacer':
      return (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            This is a visual spacing element. No content needed.
          </p>
          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    case 'reviews':
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => updateSettings({ title: e.target.value })}
              placeholder="Customer Reviews"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle (optional)
            </label>
            <input
              type="text"
              value={settings.subtitle || ''}
              onChange={(e) => updateSettings({ subtitle: e.target.value })}
              placeholder="See what our customers are saying"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layout
            </label>
            <select
              value={settings.reviewsLayout || 'grid'}
              onChange={(e) =>
                updateSettings({
                  reviewsLayout: e.target.value as 'grid' | 'list',
                })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            >
              <option value="grid">Grid (3 columns)</option>
              <option value="list">List (single column)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Reviews: {settings.reviewsLimit || 6}
            </label>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={settings.reviewsLimit || 6}
              onChange={(e) =>
                updateSettings({ reviewsLimit: parseInt(e.target.value, 10) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3</span>
              <span>12</span>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reviewsShowRatingBreakdown ?? true}
              onChange={(e) =>
                updateSettings({ reviewsShowRatingBreakdown: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Show rating breakdown summary
            </span>
          </label>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Reviews are pulled from your approved product reviews. Customers
              can submit reviews from product pages after verifying their
              purchase.
            </p>
          </div>

          <button
            type="button"
            onClick={markComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )

    default:
      return (
        <div className="py-8 text-center text-gray-500">
          <p>Content editor not available for this section type.</p>
          <button
            type="button"
            onClick={markComplete}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        </div>
      )
  }
}
