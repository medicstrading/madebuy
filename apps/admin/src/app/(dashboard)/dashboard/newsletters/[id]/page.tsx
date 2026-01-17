'use client'

import type { Newsletter } from '@madebuy/shared'
import { sanitizeHtml } from '@madebuy/shared'
import { ArrowLeft, Eye, Save, Send } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function EditNewsletterPage() {
  const params = useParams()
  const newsletterId = params?.id as string | undefined
  const router = useRouter()
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
  })

  useEffect(() => {
    if (!newsletterId) return
    async function fetchNewsletter() {
      try {
        const res = await fetch(`/api/newsletters/${newsletterId}`)
        const data = await res.json()
        setNewsletter(data.newsletter)
        setFormData({
          subject: data.newsletter.subject || '',
          content: data.newsletter.content || '',
        })
      } catch (error) {
        console.error('Failed to fetch newsletter:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchNewsletter()
  }, [newsletterId])

  async function handleSave() {
    if (!newsletterId) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save newsletter')
      }

      const data = await res.json()
      setNewsletter(data.newsletter)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSend() {
    if (!newsletterId) return
    if (
      !confirm(
        'Are you sure you want to send this newsletter? This action cannot be undone.',
      )
    )
      return

    setSending(true)
    setError('')

    try {
      // Save first
      await handleSave()

      const res = await fetch(`/api/newsletters/${newsletterId}/send`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert(`Newsletter sent to ${data.sentCount} subscribers!`)
      router.push('/dashboard/newsletters')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!newsletter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">
          Newsletter not found
        </h2>
        <Link
          href="/dashboard/newsletters"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to newsletters
        </Link>
      </div>
    )
  }

  if (newsletter.status === 'sent') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/newsletters"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {newsletter.subject}
            </h1>
            <p className="text-gray-500 mt-1">
              Sent on {new Date(newsletter.sentAt!).toLocaleDateString()} to{' '}
              {newsletter.recipientCount} subscribers
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Newsletter content is sanitized with sanitizeHtml() before rendering */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(newsletter.content),
            }}
          />
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Newsletter
            </h1>
            <p className="text-gray-500 mt-1">Draft - not yet sent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !formData.subject || !formData.content}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showPreview ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">Subject:</p>
            <p className="text-lg font-medium text-gray-900">
              {formData.subject}
            </p>
          </div>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Newsletter content is sanitized with sanitizeHtml() before rendering */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.content) }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="e.g., New arrivals this week!"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (HTML)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Write your newsletter content here..."
              rows={16}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
