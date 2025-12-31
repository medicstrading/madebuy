'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useTenantCategories, FALLBACK_MATERIAL_CATEGORIES } from '@/hooks/useTenantCategories'

interface MaterialFormProps {
  tenantId: string
  material?: any // For edit mode (future)
}

export function MaterialForm({ tenantId, material }: MaterialFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Get dynamic categories based on maker type
  const { materialCategories, isLoading: categoriesLoading } = useTenantCategories()

  // Use fetched categories or fallback to jewelry categories
  const categories = materialCategories.length > 0 ? materialCategories : FALLBACK_MATERIAL_CATEGORIES
  const [formData, setFormData] = useState({
    name: material?.name || '',
    category: material?.category || '',
    quantityInStock: material?.quantityInStock || 0,
    unit: material?.unit || '',
    reorderPoint: material?.reorderPoint || 0,
    costPerUnit: material?.costPerUnit || 0,
    supplier: material?.supplier || '',
    notes: material?.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantityInStock' || name === 'reorderPoint' || name === 'costPerUnit'
        ? parseFloat(value) || 0
        : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Material name is required')
      return
    }

    if (!formData.unit.trim()) {
      alert('Unit of measurement is required')
      return
    }

    if (formData.costPerUnit <= 0) {
      alert('Cost per unit must be greater than 0')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create material')
      }

      router.push('/dashboard/materials')
      router.refresh()
    } catch (error) {
      console.error('Material creation error:', error)
      alert('Failed to create material. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Material Details</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Material Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sterling Silver Wire"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            {categoriesLoading ? (
              <div className="flex items-center gap-2 h-[42px] rounded-lg border border-gray-300 px-3 bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading categories...</span>
              </div>
            ) : (
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Manage categories in Settings &rarr; Material Categories
            </p>
          </div>

          {/* Quantity in Stock */}
          <div>
            <label htmlFor="quantityInStock" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity in Stock *
            </label>
            <input
              type="number"
              id="quantityInStock"
              name="quantityInStock"
              value={formData.quantityInStock}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit of Measurement *
            </label>
            <input
              type="text"
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              placeholder="e.g., grams, pieces, meters"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reorder Point */}
          <div>
            <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Point *
            </label>
            <input
              type="number"
              id="reorderPoint"
              name="reorderPoint"
              value={formData.reorderPoint}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              You&apos;ll be alerted when stock falls below this level
            </p>
          </div>

          {/* Cost per Unit */}
          <div>
            <label htmlFor="costPerUnit" className="block text-sm font-medium text-gray-700 mb-1">
              Cost per Unit (AUD) *
            </label>
            <input
              type="number"
              id="costPerUnit"
              name="costPerUnit"
              value={formData.costPerUnit}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6">
          {/* Supplier */}
          <div className="mb-4">
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="e.g., Rio Grande"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Additional information about this material..."
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Material'}
        </button>
      </div>
    </form>
  )
}
