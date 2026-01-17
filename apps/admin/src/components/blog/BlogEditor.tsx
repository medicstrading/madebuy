'use client'

import type { BlogPost, MediaItem } from '@madebuy/shared'
import { Eye, Image as ImageIcon, Save, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Lazy load TipTap editor to reduce initial bundle size (~200KB)
const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
    ),
  },
)

interface BlogEditorProps {
  tenantId: string
  availableMedia: MediaItem[]
  existingPost?: BlogPost
}

export function BlogEditor({
  tenantId,
  availableMedia,
  existingPost,
}: BlogEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [title, setTitle] = useState(existingPost?.title || '')
  const [content, setContent] = useState(existingPost?.content || '')
  const [excerpt, setExcerpt] = useState(existingPost?.excerpt || '')
  const [coverImageId, setCoverImageId] = useState<string | undefined>(
    existingPost?.coverImageId,
  )
  const [tags, setTags] = useState<string[]>(existingPost?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [metaTitle, setMetaTitle] = useState(existingPost?.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(
    existingPost?.metaDescription || '',
  )
  const [status, setStatus] = useState<'draft' | 'published'>(
    existingPost?.status || 'draft',
  )
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const coverImage = availableMedia.find((m) => m.id === coverImageId)

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    if (!content.trim()) {
      alert('Please enter content')
      return
    }

    setSaving(true)

    try {
      const payload = {
        title,
        content,
        excerpt,
        coverImageId,
        tags,
        metaTitle,
        metaDescription,
        status: saveStatus,
      }

      if (existingPost) {
        // Update existing post
        const response = await fetch(`/api/blog/${existingPost.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to update post')
        }

        alert('Post updated successfully!')
      } else {
        // Create new post
        const response = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to create post')
        }

        const newPost = await response.json()
        router.push(`/dashboard/blog/${newPost.id}`)
        alert('Post created successfully!')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save post. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingPost) return

    if (
      !confirm(
        'Are you sure you want to delete this post? This action cannot be undone.',
      )
    ) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/blog/${existingPost.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      router.push('/dashboard/blog')
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete post. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            className="w-full px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content *
          </label>
          <RichTextEditor content={content} onChange={setContent} />
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excerpt
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief description of your post (150-300 characters)..."
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">
            {excerpt.length}/300 characters
          </p>
        </div>

        {/* SEO Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            SEO Settings
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Leave empty to use post title..."
                maxLength={60}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                {(metaTitle || title).length}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for search engines..."
                rows={3}
                maxLength={160}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                {metaDescription.length}/160 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Publish</h3>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'draft' | 'published')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Save Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="h-4 w-4" />
              {saving ? 'Publishing...' : 'Publish'}
            </button>

            {existingPost && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* Cover Image */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Cover Image</h3>

          {coverImage ? (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={
                    coverImage.variants.thumb?.url ||
                    coverImage.variants.original.url
                  }
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                Change Image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
              className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-900"
            >
              <ImageIcon className="mx-auto h-8 w-8 mb-2" />
              <span className="text-sm">Select Cover Image</span>
            </button>
          )}

          {showMediaPicker && (
            <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 gap-2 p-2">
                {availableMedia.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setCoverImageId(item.id)
                      setShowMediaPicker(false)
                    }}
                    className="relative aspect-video rounded overflow-hidden hover:ring-2 hover:ring-blue-500"
                  >
                    <Image
                      src={
                        item.variants.thumb?.url || item.variants.original.url
                      }
                      alt={item.caption || ''}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
