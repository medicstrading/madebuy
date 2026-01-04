'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import type { NewsletterTemplate } from '@madebuy/shared'

export default function NewsletterTemplatePage() {
  const [template, setTemplate] = useState<NewsletterTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchTemplate()
  }, [])

  async function fetchTemplate() {
    try {
      const res = await fetch('/api/newsletters/template')
      const data = await res.json()
      setTemplate(data.template)
    } catch (error) {
      console.error('Failed to fetch template:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!template) return
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/newsletters/template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: template.header,
          colors: template.colors,
          footer: template.footer,
          sections: template.sections,
        }),
      })

      if (!res.ok) throw new Error('Failed to save template')

      setSuccess('Template saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Reset template to defaults? This cannot be undone.')) return

    try {
      const res = await fetch('/api/newsletters/template', { method: 'DELETE' })
      const data = await res.json()
      setTemplate(data.template)
      setSuccess('Template reset to defaults!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Failed to reset template:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/newsletters"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Newsletter Template</h1>
            <p className="text-gray-500 mt-1">Customize the look of your newsletters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Header Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Header</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
            <input
              type="text"
              value={template.header.headerText || ''}
              onChange={(e) => setTemplate({
                ...template,
                header: { ...template.header, headerText: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={template.header.tagline || ''}
              onChange={(e) => setTemplate({
                ...template,
                header: { ...template.header, tagline: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Text</label>
          <input
            type="text"
            value={template.header.greetingText || ''}
            onChange={(e) => setTemplate({
              ...template,
              header: { ...template.header, greetingText: e.target.value }
            })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showLogo"
            checked={template.header.showLogo}
            onChange={(e) => setTemplate({
              ...template,
              header: { ...template.header, showLogo: e.target.checked }
            })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="showLogo" className="text-sm text-gray-700">Show logo in header</label>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Colors</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template.colors.primary}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, primary: e.target.value }
                })}
                className="h-10 w-16 rounded border border-gray-200"
              />
              <input
                type="text"
                value={template.colors.primary}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, primary: e.target.value }
                })}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template.colors.accent}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, accent: e.target.value }
                })}
                className="h-10 w-16 rounded border border-gray-200"
              />
              <input
                type="text"
                value={template.colors.accent}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, accent: e.target.value }
                })}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template.colors.background}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, background: e.target.value }
                })}
                className="h-10 w-16 rounded border border-gray-200"
              />
              <input
                type="text"
                value={template.colors.background}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, background: e.target.value }
                })}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={template.colors.text}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, text: e.target.value }
                })}
                className="h-10 w-16 rounded border border-gray-200"
              />
              <input
                type="text"
                value={template.colors.text}
                onChange={(e) => setTemplate({
                  ...template,
                  colors: { ...template.colors, text: e.target.value }
                })}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Footer</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Text</label>
            <input
              type="text"
              value={template.footer.signatureText || ''}
              onChange={(e) => setTemplate({
                ...template,
                footer: { ...template.footer, signatureText: e.target.value }
              })}
              placeholder="e.g., Best regards,"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signature Name</label>
            <input
              type="text"
              value={template.footer.signatureName || ''}
              onChange={(e) => setTemplate({
                ...template,
                footer: { ...template.footer, signatureName: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
          <textarea
            value={template.footer.footerText || ''}
            onChange={(e) => setTemplate({
              ...template,
              footer: { ...template.footer, footerText: e.target.value }
            })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showSocialLinks"
            checked={template.footer.showSocialLinks}
            onChange={(e) => setTemplate({
              ...template,
              footer: { ...template.footer, showSocialLinks: e.target.checked }
            })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="showSocialLinks" className="text-sm text-gray-700">Show social media links</label>
        </div>
      </div>

      {/* CTA Button */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Call to Action Button</h2>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showCtaButton"
            checked={template.sections.showCtaButton}
            onChange={(e) => setTemplate({
              ...template,
              sections: { ...template.sections, showCtaButton: e.target.checked }
            })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="showCtaButton" className="text-sm text-gray-700">Show CTA button</label>
        </div>

        {template.sections.showCtaButton && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                value={template.sections.ctaButtonText || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  sections: { ...template.sections, ctaButtonText: e.target.value }
                })}
                placeholder="e.g., Shop Now"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
              <input
                type="url"
                value={template.sections.ctaButtonUrl || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  sections: { ...template.sections, ctaButtonUrl: e.target.value }
                })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
