'use client'

import type { Piece } from '@madebuy/shared'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import {
  FALLBACK_PRODUCT_CATEGORIES,
  useTenantCategories,
} from '@/hooks/useTenantCategories'

interface ItemStepProps {
  initialData: Partial<Piece> | null
  onSave: (data: Partial<Piece>, pieceId: string) => void
  onSkip: () => void
  loading: boolean
}

export function ItemStep({
  initialData,
  onSave,
  onSkip,
  loading,
}: ItemStepProps) {
  const { productCategories, isLoading: categoriesLoading } =
    useTenantCategories()
  const categories =
    productCategories.length > 0
      ? productCategories
      : FALLBACK_PRODUCT_CATEGORIES

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    price: initialData?.price || 0,
    stock: initialData?.stock,
  })

  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'price' || name === 'stock'
          ? value === ''
            ? undefined
            : parseFloat(value)
          : value,
    }))
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleGenerateDescription = async () => {
    if (!formData.name.trim()) {
      setErrors((prev) => ({
        ...prev,
        name: 'Enter a name first to generate description',
      }))
      return
    }

    setGeneratingDescription(true)
    try {
      const response = await fetch('/api/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, description: data.description }))
      }
    } catch (error) {
      console.error('Failed to generate description:', error)
    } finally {
      setGeneratingDescription(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      // Create the piece
      const response = await fetch('/api/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft', // Always create as draft in wizard
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create piece')
      }

      const { piece } = await response.json()
      onSave(formData, piece.id)
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Failed to save',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          What are you selling?
        </h2>
        <p className="mt-2 text-gray-600">
          Start with the basics - you can add more details later
        </p>
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Handmade Ceramic Mug"
          className={`w-full rounded-xl border-2 p-4 text-lg transition-colors focus:outline-none focus:ring-0 ${
            errors.name
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-200 focus:border-purple-500'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Description with AI */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <button
            type="button"
            type="button"
            onClick={handleGenerateDescription}
            disabled={generatingDescription || !formData.name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingDescription ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generatingDescription ? 'Generating...' : 'AI Generate'}
          </button>
        </div>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your item... (optional)"
          rows={4}
          className="w-full rounded-xl border-2 border-gray-200 p-4 focus:border-purple-500 focus:outline-none focus:ring-0 transition-colors resize-none"
        />
      </div>

      {/* Category & Price row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Category *
          </label>
          {categoriesLoading ? (
            <div className="flex items-center gap-2 h-[58px] rounded-xl border-2 border-gray-200 px-4 bg-gray-50">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full rounded-xl border-2 p-4 focus:outline-none focus:ring-0 transition-colors ${
                errors.category
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-200 focus:border-purple-500'
              }`}
            >
              <option value="">Select category</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          )}
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Price
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              $
            </span>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-xl border-2 border-gray-200 p-4 pl-8 focus:border-purple-500 focus:outline-none focus:ring-0 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stock (optional) */}
      <div>
        <label
          htmlFor="stock"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Stock Quantity{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="number"
          id="stock"
          name="stock"
          value={formData.stock ?? ''}
          onChange={handleChange}
          min="0"
          step="1"
          placeholder="Leave empty for unlimited or one-of-a-kind"
          className="w-full rounded-xl border-2 border-gray-200 p-4 focus:border-purple-500 focus:outline-none focus:ring-0 transition-colors"
        />
      </div>

      {/* Form error */}
      {errors.form && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{errors.form}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
        <button
          type="button"
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            'Next: Add Photos'
          )}
        </button>
      </div>
    </form>
  )
}
