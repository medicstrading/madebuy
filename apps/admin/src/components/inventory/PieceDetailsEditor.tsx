'use client'

import type { Piece } from '@madebuy/shared'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  FALLBACK_PRODUCT_CATEGORIES,
  useTenantCategories,
} from '@/hooks/useTenantCategories'

interface PieceDetailsEditorProps {
  piece: Piece
}

type EditableField =
  | 'name'
  | 'category'
  | 'price'
  | 'stock'
  | 'description'
  | 'status'
  | null

export function PieceDetailsEditor({ piece }: PieceDetailsEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditableField>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form values
  const [name, setName] = useState(piece.name)
  const [category, setCategory] = useState(piece.category)
  const [price, setPrice] = useState(piece.price)
  const [stock, setStock] = useState<number | undefined>(piece.stock)
  const [description, setDescription] = useState(piece.description || '')
  const [status, setStatus] = useState(piece.status)

  const { productCategories } = useTenantCategories()
  const categories =
    productCategories.length > 0
      ? productCategories
      : FALLBACK_PRODUCT_CATEGORIES

  const saveField = async (field: string, value: any) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/pieces/${piece.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }

      setEditing(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    // Reset to original values
    setName(piece.name)
    setCategory(piece.category)
    setPrice(piece.price)
    setStock(piece.stock)
    setDescription(piece.description || '')
    setStatus(piece.status)
    setEditing(null)
    setError(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: piece.currency || 'AUD',
    }).format(amount)
  }

  return (
    <div className="space-y-1">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-gray-500">Name</dt>
          <dd className="mt-1">
            {editing === 'name' ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => saveField('name', name)}
                  disabled={saving || !name.trim()}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-gray-900">{piece.name}</span>
                <button
                  type="button"
                  onClick={() => setEditing('name')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>

        {/* Category */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Category</dt>
          <dd className="mt-1">
            {editing === 'category' ? (
              <div className="flex items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={() => saveField('category', category)}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-gray-900">{piece.category}</span>
                <button
                  type="button"
                  onClick={() => setEditing('category')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>

        {/* Status */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Status</dt>
          <dd className="mt-1">
            {editing === 'status' ? (
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  type="button"
                  onClick={() => saveField('status', status)}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <StatusBadge status={piece.status} />
                <button
                  type="button"
                  onClick={() => setEditing('status')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>

        {/* Price */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Price</dt>
          <dd className="mt-1">
            {editing === 'price' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => saveField('price', price)}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-gray-900">
                  {formatCurrency(piece.price ?? 0)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing('price')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>

        {/* Stock */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Stock</dt>
          <dd className="mt-1">
            {editing === 'stock' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stock ?? ''}
                  onChange={(e) =>
                    setStock(
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  min="0"
                  step="1"
                  placeholder="Unlimited"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => saveField('stock', stock)}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-gray-900">
                  {piece.stock ?? 'Unlimited'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing('stock')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-gray-500">Description</dt>
          <dd className="mt-1">
            {editing === 'description' ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveField('description', description)}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 group">
                <span className="text-gray-900 whitespace-pre-wrap flex-1">
                  {piece.description || (
                    <span className="text-gray-400 italic">No description</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing('description')}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    available: 'bg-green-100 text-green-800',
    sold: 'bg-blue-100 text-blue-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-600',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[status] || colors.draft}`}
    >
      {status}
    </span>
  )
}
