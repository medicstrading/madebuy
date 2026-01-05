'use client'

import { useState } from 'react'
import { Mail, Check } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

export function NewsletterSignup({ settings, tenant, tenantSlug }: SectionProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = settings.newsletterTitle || settings.title || 'Stay in the Loop'
  const description = settings.newsletterDescription || settings.subtitle ||
    'Subscribe to our newsletter for exclusive updates, new releases, and special offers.'
  const buttonText = settings.newsletterButtonText || 'Subscribe'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to subscribe')
      }

      setSubmitted(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="py-12 md:py-16"
      style={{
        backgroundColor: `${tenant.primaryColor}10`,
      }}
    >
      <div className="max-w-2xl mx-auto px-6 text-center">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${tenant.primaryColor}20` }}
        >
          {submitted ? (
            <Check className="w-8 h-8" style={{ color: tenant.primaryColor }} />
          ) : (
            <Mail className="w-8 h-8" style={{ color: tenant.primaryColor }} />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-4">
          {submitted ? 'You\'re Subscribed!' : title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          {submitted
            ? 'Thank you for subscribing. We\'ll keep you updated with our latest news.'
            : description}
        </p>

        {/* Form */}
        {!submitted && (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
            >
              {isSubmitting ? 'Subscribing...' : buttonText}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-red-600 text-sm">{error}</p>
        )}

        {/* Privacy note */}
        {!submitted && (
          <p className="mt-4 text-xs text-gray-500">
            We respect your privacy. Unsubscribe at any time.
          </p>
        )}
      </div>
    </div>
  )
}
