'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

export function ContactSection({ settings, tenant, tenantSlug }: SectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = settings.title || 'Get in Touch'
  const subtitle = settings.subtitle
  const showContactForm = settings.showContactForm ?? true
  const showEmail = settings.showEmail ?? true
  const showPhone = settings.showPhone ?? true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          source: 'contact-section',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setSubmitted(true)
      setFormData({ name: '', email: '', message: '' })
    } catch (err) {
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Contact Info */}
        <div>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 mb-8">
              {subtitle}
            </p>
          )}

          <div className="space-y-6">
            {showEmail && tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${tenant.primaryColor}20` }}
                >
                  <Mail className="w-5 h-5" style={{ color: tenant.primaryColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{tenant.email}</p>
                </div>
              </a>
            )}

            {showPhone && tenant.phone && (
              <a
                href={`tel:${tenant.phone}`}
                className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${tenant.primaryColor}20` }}
                >
                  <Phone className="w-5 h-5" style={{ color: tenant.primaryColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{tenant.phone}</p>
                </div>
              </a>
            )}

            {tenant.location && (
              <div className="flex items-center gap-4 text-gray-600">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${tenant.primaryColor}20` }}
                >
                  <MapPin className="w-5 h-5" style={{ color: tenant.primaryColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{tenant.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        {showContactForm && (
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${tenant.primaryColor}20` }}
                >
                  <Send className="w-8 h-8" style={{ color: tenant.primaryColor }} />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-600">
                  Thank you for reaching out. We&apos;ll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                  style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
