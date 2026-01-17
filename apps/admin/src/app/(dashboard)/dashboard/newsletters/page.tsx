'use client'

import type { Newsletter, NewsletterStats } from '@madebuy/shared'
import {
  CheckCircle,
  Edit,
  Newspaper,
  Plus,
  Send,
  Settings,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [stats, setStats] = useState<NewsletterStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetchNewsletters()
    fetchStats()
  }, [fetchNewsletters, fetchStats])

  async function fetchNewsletters() {
    try {
      const res = await fetch('/api/newsletters')
      const data = await res.json()
      setNewsletters(data.items || [])
    } catch (error) {
      console.error('Failed to fetch newsletters:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/newsletters/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function sendNewsletter(id: string) {
    if (
      !confirm(
        'Are you sure you want to send this newsletter? This action cannot be undone.',
      )
    )
      return

    setSending(id)
    try {
      const res = await fetch(`/api/newsletters/${id}/send`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert(`Newsletter sent to ${data.sentCount} subscribers!`)
      fetchNewsletters()
      fetchStats()
    } catch (error: any) {
      alert(error.message || 'Failed to send newsletter')
    } finally {
      setSending(null)
    }
  }

  async function deleteNewsletter(id: string) {
    if (!confirm('Are you sure you want to delete this newsletter?')) return

    try {
      await fetch(`/api/newsletters/${id}`, { method: 'DELETE' })
      fetchNewsletters()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete newsletter:', error)
    }
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletters</h1>
          <p className="text-gray-500 mt-1">
            Create and send newsletters to your subscribers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/newsletters/template"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Template
          </Link>
          <Link
            href="/dashboard/newsletters/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Newsletter
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total Newsletters</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.total}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {stats.drafts}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Sent</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.sent}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Last Sent</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {stats.lastSentAt ? formatDate(stats.lastSentAt) : 'Never'}
            </p>
          </div>
        </div>
      )}

      {/* Newsletter List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {newsletters.length === 0 ? (
          <div className="p-12 text-center">
            <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No newsletters yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first newsletter to engage with your subscribers.
            </p>
            <Link
              href="/dashboard/newsletters/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Newsletter
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {newsletters.map((newsletter) => (
              <div key={newsletter.id} className="p-4 sm:p-6 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {newsletter.subject || 'Untitled Newsletter'}
                      </h3>
                      {newsletter.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Created {formatDate(newsletter.createdAt)}</span>
                      {newsletter.sentAt && (
                        <span>
                          Sent to {newsletter.recipientCount} subscribers
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {newsletter.status === 'draft' && (
                      <>
                        <Link
                          href={`/dashboard/newsletters/${newsletter.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => sendNewsletter(newsletter.id)}
                          disabled={sending === newsletter.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          title="Send"
                        >
                          <Send className="h-4 w-4" />
                          {sending === newsletter.id ? 'Sending...' : 'Send'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNewsletter(newsletter.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
