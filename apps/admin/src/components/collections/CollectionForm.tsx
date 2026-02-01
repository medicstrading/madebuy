'use client'

import type { Collection, CreateCollectionInput, Piece } from '@madebuy/shared'
import { Package, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface CollectionFormProps {
  collection?: Collection
}

export function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loadingPieces, setLoadingPieces] = useState(true)

  const [formData, setFormData] = useState<CreateCollectionInput>({
    name: collection?.name || '',
    slug: collection?.slug || '',
    description: collection?.description || '',
    pieceIds: collection?.pieceIds || [],
    isPublished: collection?.isPublished ?? false,
    isFeatured: collection?.isFeatured ?? false,
    sortOrder: collection?.sortOrder ?? 0,
  })

  useEffect(() => {
    fetchPieces()
  }, [fetchPieces])

  async function fetchPieces() {
    try {
      const res = await fetch('/api/pieces')
      const data = await res.json()
      setPieces(data.pieces || [])
    } catch (error) {
      console.error('Failed to fetch pieces:', error)
    } finally {
      setLoadingPieces(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(
        collection ? `/api/collections/${collection.id}` : '/api/collections',
        {
          method: collection ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save collection')
      }

      router.push('/dashboard/collections')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function togglePiece(pieceId: string) {
    const currentIds = formData.pieceIds || []
    if (currentIds.includes(pieceId)) {
      setFormData({
        ...formData,
        pieceIds: currentIds.filter((id) => id !== pieceId),
      })
    } else {
      setFormData({ ...formData, pieceIds: [...currentIds, pieceId] })
    }
  }

  const selectedPieces = pieces.filter((p) => formData.pieceIds?.includes(p.id))
  const availablePieces = pieces.filter(
    (p) => !formData.pieceIds?.includes(p.id),
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Collection Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Summer Collection"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug
            </label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-'),
                })
              }
              placeholder="Auto-generated from name"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe this collection..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) =>
                setFormData({ ...formData, isPublished: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isPublished"
              className="text-sm font-medium text-gray-700"
            >
              Published
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) =>
                setFormData({ ...formData, isFeatured: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isFeatured"
              className="text-sm font-medium text-gray-700"
            >
              Featured
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sortOrder: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Products Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Products in Collection ({formData.pieceIds?.length || 0})
        </h2>

        {/* Selected Products */}
        {selectedPieces.length > 0 && (
          <div className="space-y-2">
            {selectedPieces.map((piece) => (
              <div
                key={piece.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">
                    {piece.name}
                  </span>
                </div>
                <button
                  onClick={() => togglePiece(piece.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Products */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Products
          </label>
          {loadingPieces ? (
            <p className="text-sm text-gray-500">Loading products...</p>
          ) : availablePieces.length === 0 ? (
            <p className="text-sm text-gray-500">
              {pieces.length === 0
                ? 'No products available'
                : 'All products added'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availablePieces.map((piece) => (
                <button
                  type="button"
                  key={piece.id}
                  onClick={() => togglePiece(piece.id)}
                  className="flex items-center gap-3 p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">
                    {piece.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? 'Saving...'
            : collection
              ? 'Update Collection'
              : 'Create Collection'}
        </button>
      </div>
    </form>
  )
}
