'use client'

import type { Collection } from '@madebuy/shared'
import { Edit, Eye, EyeOff, FolderOpen, Plus, Star, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  async function fetchCollections() {
    try {
      const res = await fetch('/api/collections')
      const data = await res.json()
      setCollections(data.items || [])
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    } finally {
      setLoading(false)
    }
  }

  async function togglePublished(id: string, currentState: boolean) {
    try {
      await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentState }),
      })
      fetchCollections()
    } catch (error) {
      console.error('Failed to toggle collection:', error)
    }
  }

  async function toggleFeatured(id: string, currentState: boolean) {
    try {
      await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentState }),
      })
      fetchCollections()
    } catch (error) {
      console.error('Failed to toggle featured:', error)
    }
  }

  async function deleteCollection(id: string) {
    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      await fetch(`/api/collections/${id}`, { method: 'DELETE' })
      fetchCollections()
    } catch (error) {
      console.error('Failed to delete collection:', error)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-500 mt-1">
            Organize products into themed collections
          </p>
        </div>
        <Link
          href="/dashboard/collections/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Link>
      </div>

      {/* Collection Grid */}
      {collections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No collections yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create collections to group and showcase your products.
          </p>
          <Link
            href="/dashboard/collections/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cover Image */}
              <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <FolderOpen className="h-12 w-12 text-blue-300" />
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {collection.pieceIds.length} products
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {collection.isFeatured && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                    {collection.isPublished ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {collection.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/dashboard/collections/${collection.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      togglePublished(collection.id, collection.isPublished)
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      collection.isPublished
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={collection.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {collection.isPublished ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleFeatured(
                        collection.id,
                        collection.isFeatured || false,
                      )
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      collection.isFeatured
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={collection.isFeatured ? 'Unfeature' : 'Feature'}
                  >
                    <Star
                      className={`h-4 w-4 ${collection.isFeatured ? 'fill-amber-500' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCollection(collection.id)}
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
  )
}
