'use client'

import { BookOpen, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

export function BlogSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [enabled, setEnabled] = useState(false)
  const [title, setTitle] = useState('Blog')
  const [description, setDescription] = useState('')

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/website-design')
      if (!response.ok) throw new Error('Failed to load settings')

      const data = await response.json()
      const blogSettings = data.websiteDesign?.blog

      if (blogSettings) {
        setEnabled(blogSettings.enabled || false)
        setTitle(blogSettings.title || 'Blog')
        setDescription(blogSettings.description || '')
      }
    } catch (error) {
      console.error('Error loading blog settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog: {
            enabled,
            title,
            description,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      alert('Blog settings saved successfully!')
    } catch (error) {
      console.error('Error saving blog settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Blog Settings</h2>
            <p className="text-sm text-gray-600">
              Enable and customize your blog for your storefront
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable Blog
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Make the blog accessible on your storefront at /{'{tenant}'}
                /blog
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {enabled && (
            <>
              {/* Blog Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blog Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Blog"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The title displayed on your blog index page
                </p>
              </div>

              {/* Blog Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blog Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Read the latest stories and updates..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  A short description shown on your blog index page (optional)
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  How to create blog posts
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>
                      Go to the <strong>Blog</strong> section in the sidebar
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>
                      Click <strong>New Post</strong> to create a blog post
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    <span>
                      Or use the <strong>Publish</strong> section to publish to
                      your blog and social media at the same time
                    </span>
                  </li>
                </ul>
              </div>

              {/* Preview Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Blog URL
                </h3>
                <p className="text-sm text-gray-600">
                  Your blog will be available at:
                </p>
                <code className="mt-2 block px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-800">
                  www.madebuy.com.au/{'{tenant}'}/blog
                </code>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
