'use client'

import type {
  Bundle,
  BundlePiece,
  BundleStatus,
  CreateBundleInput,
  Piece,
} from '@madebuy/shared'
import { DollarSign, ImageIcon, Minus, Percent, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface BundleBuilderProps {
  bundle?: Bundle
}

interface PieceWithImage extends Piece {
  thumbnailUrl?: string
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export function BundleBuilder({ bundle }: BundleBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pieces, setPieces] = useState<PieceWithImage[]>([])
  const [loadingPieces, setLoadingPieces] = useState(true)

  const [formData, setFormData] = useState<{
    name: string
    slug: string
    description: string
    pieces: BundlePiece[]
    bundlePrice: number // in cents
    status: BundleStatus
    imageId?: string
  }>({
    name: bundle?.name || '',
    slug: bundle?.slug || '',
    description: bundle?.description || '',
    pieces: bundle?.pieces || [],
    bundlePrice: bundle?.bundlePrice || 0,
    status: bundle?.status || 'draft',
    imageId: bundle?.imageId,
  })

  useEffect(() => {
    fetchPieces()
  }, [fetchPieces])

  async function fetchPieces() {
    try {
      const res = await fetch('/api/pieces?status=available')
      const data = await res.json()
      setPieces(data.pieces || [])
    } catch (error) {
      console.error('Failed to fetch pieces:', error)
    } finally {
      setLoadingPieces(false)
    }
  }

  // Calculate original price (sum of individual piece prices)
  const originalPrice = useMemo(() => {
    let total = 0
    for (const bp of formData.pieces) {
      const piece = pieces.find((p) => p.id === bp.pieceId)
      if (piece?.price) {
        total += piece.price * bp.quantity
      }
    }
    return total
  }, [formData.pieces, pieces])

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    if (originalPrice <= 0) return 0
    const discount =
      ((originalPrice - formData.bundlePrice) / originalPrice) * 100
    return Math.round(discount * 10) / 10
  }, [originalPrice, formData.bundlePrice])

  // Calculate savings
  const savings = useMemo(() => {
    return Math.max(0, originalPrice - formData.bundlePrice)
  }, [originalPrice, formData.bundlePrice])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload: CreateBundleInput = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        pieces: formData.pieces,
        bundlePrice: formData.bundlePrice,
        status: formData.status,
        imageId: formData.imageId,
      }

      const res = await fetch(
        bundle ? `/api/bundles/${bundle.id}` : '/api/bundles',
        {
          method: bundle ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save bundle')
      }

      router.push('/dashboard/bundles')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function addPiece(pieceId: string) {
    const existing = formData.pieces.find((p) => p.pieceId === pieceId)
    if (existing) {
      // Increment quantity
      setFormData({
        ...formData,
        pieces: formData.pieces.map((p) =>
          p.pieceId === pieceId ? { ...p, quantity: p.quantity + 1 } : p,
        ),
      })
    } else {
      setFormData({
        ...formData,
        pieces: [...formData.pieces, { pieceId, quantity: 1 }],
      })
    }
  }

  function removePiece(pieceId: string) {
    setFormData({
      ...formData,
      pieces: formData.pieces.filter((p) => p.pieceId !== pieceId),
    })
  }

  function updateQuantity(pieceId: string, quantity: number) {
    if (quantity < 1) {
      removePiece(pieceId)
      return
    }
    setFormData({
      ...formData,
      pieces: formData.pieces.map((p) =>
        p.pieceId === pieceId ? { ...p, quantity } : p,
      ),
    })
  }

  // Get piece details for display
  function getPieceDetails(pieceId: string): PieceWithImage | undefined {
    return pieces.find((p) => p.id === pieceId)
  }

  const selectedPieceIds = formData.pieces.map((p) => p.pieceId)
  const availablePieces = pieces.filter((p) => !selectedPieceIds.includes(p.id))

  // Auto-suggest bundle price (e.g., 10% off original)
  function suggestPrice(discountPercent: number) {
    const suggested = Math.round(originalPrice * (1 - discountPercent / 100))
    setFormData({ ...formData, bundlePrice: suggested })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Bundle Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Bundle Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bundle Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Starter Kit Bundle"
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
              value={formData.slug}
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
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe what's included in this bundle..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as BundleStatus,
                })
              }
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Products in Bundle ({formData.pieces.length})
        </h2>

        {/* Selected Products */}
        {formData.pieces.length > 0 && (
          <div className="space-y-2">
            {formData.pieces.map((bp) => {
              const piece = getPieceDetails(bp.pieceId)
              if (!piece) return null

              return (
                <div
                  key={bp.pieceId}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {piece.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(piece.price || 0)} each
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                      <button
                        onClick={() =>
                          updateQuantity(bp.pieceId, bp.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-l-lg"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {bp.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(bp.pieceId, bp.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-r-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <span className="w-20 text-right font-medium text-gray-900">
                      {formatPrice((piece.price || 0) * bp.quantity)}
                    </span>

                    <button
                      onClick={() => removePiece(bp.pieceId)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Products */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Products
          </label>
          {loadingPieces ? (
            <p className="text-sm text-gray-500">Loading products...</p>
          ) : availablePieces.length === 0 && formData.pieces.length === 0 ? (
            <p className="text-sm text-gray-500">
              No available products. Create products first.
            </p>
          ) : availablePieces.length === 0 ? (
            <p className="text-sm text-gray-500">
              All products added. Adjust quantities above.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availablePieces.map((piece) => (
                <button
                  type="button"
                  key={piece.id}
                  onClick={() => addPiece(piece.id)}
                  className="flex items-center gap-3 p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {piece.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(piece.price || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Bundle Pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price Summary */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">
                Original Price (sum of products)
              </span>
              <span className="font-medium text-gray-900">
                {formatPrice(originalPrice)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle Price *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={(formData.bundlePrice / 100).toFixed(2)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bundlePrice: Math.round(
                        parseFloat(e.target.value || '0') * 100,
                      ),
                    })
                  }
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => suggestPrice(10)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  10% off
                </button>
                <button
                  onClick={() => suggestPrice(15)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  15% off
                </button>
                <button
                  onClick={() => suggestPrice(20)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  20% off
                </button>
                <button
                  onClick={() => suggestPrice(25)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  25% off
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(formData.bundlePrice)}
                </span>
                {originalPrice > formData.bundlePrice && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </div>

              {discountPercent > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <Percent className="h-3 w-3" />
                    {discountPercent}% OFF
                  </span>
                  <span className="text-sm text-gray-500">
                    Save {formatPrice(savings)}
                  </span>
                </div>
              )}

              {discountPercent <= 0 && formData.pieces.length > 0 && (
                <p className="text-sm text-amber-600">
                  Set a bundle price lower than {formatPrice(originalPrice)} to
                  show savings
                </p>
              )}
            </div>
          </div>
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
          disabled={loading || formData.pieces.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : bundle ? 'Update Bundle' : 'Create Bundle'}
        </button>
      </div>
    </form>
  )
}
