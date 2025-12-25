'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Material } from '@madebuy/shared'
import { Plus, Trash2, Calculator } from 'lucide-react'

interface PieceFormProps {
  tenantId: string
  availableMaterials: Material[]
  piece?: any // For edit mode (future)
}

interface MaterialUsageEntry {
  materialId: string
  quantityUsed: number
}

export function PieceForm({ tenantId, availableMaterials, piece }: PieceFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Piece data
  const [formData, setFormData] = useState({
    name: piece?.name || '',
    description: piece?.description || '',
    category: piece?.category || '',
    status: piece?.status || 'draft',
    price: piece?.price || 0,
    currency: piece?.currency || 'AUD',
    stock: piece?.stock || undefined,
  })

  // Material usage tracking
  const [materialUsages, setMaterialUsages] = useState<MaterialUsageEntry[]>([])

  // Calculate total COGS
  const totalCOGS = useMemo(() => {
    return materialUsages.reduce((total, usage) => {
      const material = availableMaterials.find(m => m.id === usage.materialId)
      if (!material) return total
      return total + (material.costPerUnit * usage.quantityUsed)
    }, 0)
  }, [materialUsages, availableMaterials])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock'
        ? (value === '' ? undefined : parseFloat(value))
        : value
    }))
  }

  const addMaterialUsage = () => {
    if (availableMaterials.length === 0) {
      alert('No materials available. Please add materials first.')
      return
    }
    setMaterialUsages(prev => [...prev, { materialId: '', quantityUsed: 0 }])
  }

  const removeMaterialUsage = (index: number) => {
    setMaterialUsages(prev => prev.filter((_, i) => i !== index))
  }

  const updateMaterialUsage = (index: number, field: 'materialId' | 'quantityUsed', value: string | number) => {
    setMaterialUsages(prev => prev.map((usage, i) => {
      if (i !== index) return usage
      return {
        ...usage,
        [field]: field === 'quantityUsed' ? parseFloat(value as string) || 0 : value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Piece name is required')
      return
    }

    if (!formData.category.trim()) {
      alert('Category is required')
      return
    }

    setSubmitting(true)

    try {
      // Create the piece
      const pieceResponse = await fetch('/api/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!pieceResponse.ok) {
        throw new Error('Failed to create piece')
      }

      const { piece: createdPiece } = await pieceResponse.json()

      // Record material usages if any
      if (materialUsages.length > 0) {
        const validUsages = materialUsages.filter(u => u.materialId && u.quantityUsed > 0)

        for (const usage of validUsages) {
          await fetch(`/api/materials/${usage.materialId}/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pieceId: createdPiece.id,
              quantityUsed: usage.quantityUsed,
            }),
          })
        }
      }

      router.push('/dashboard/inventory')
      router.refresh()
    } catch (error) {
      console.error('Piece creation error:', error)
      alert('Failed to create piece. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Piece Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sterling Silver Ring"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe your piece..."
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              <option value="Rings">Rings</option>
              <option value="Necklaces">Necklaces</option>
              <option value="Earrings">Earrings</option>
              <option value="Bracelets">Bracelets</option>
              <option value="Pendants">Pendants</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock || ''}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="Leave empty for unlimited"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty for unlimited or one-of-a-kind pieces
            </p>
          </div>
        </div>
      </div>

      {/* Material Usage */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Material Usage</h2>
            <p className="text-sm text-gray-600">Track materials used in this piece</p>
          </div>
          <button
            type="button"
            onClick={addMaterialUsage}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </div>

        {materialUsages.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <Calculator className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No materials added yet. Click &ldquo;Add Material&rdquo; to track material costs and calculate COGS.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {materialUsages.map((usage, index) => {
              const selectedMaterial = availableMaterials.find(m => m.id === usage.materialId)
              const lineCost = selectedMaterial ? selectedMaterial.costPerUnit * usage.quantityUsed : 0

              return (
                <div key={index} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                  <div className="flex-1 grid gap-3 md:grid-cols-3">
                    {/* Material Selection */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <select
                        value={usage.materialId}
                        onChange={(e) => updateMaterialUsage(index, 'materialId', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select material</option>
                        {availableMaterials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Used */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={usage.quantityUsed || ''}
                        onChange={(e) => updateMaterialUsage(index, 'quantityUsed', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {selectedMaterial && (
                        <p className="mt-1 text-xs text-gray-500">
                          ${selectedMaterial.costPerUnit.toFixed(2)} per {selectedMaterial.unit}
                        </p>
                      )}
                    </div>

                    {/* Line Cost */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost
                      </label>
                      <div className="flex items-center h-[42px] rounded-lg bg-gray-50 px-3 text-sm font-medium text-gray-900">
                        ${lineCost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMaterialUsage(index)}
                    className="mt-7 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )
            })}

            {/* Total COGS */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Cost of Goods Sold (COGS)</span>
              </div>
              <span className="text-xl font-bold text-blue-900">
                ${totalCOGS.toFixed(2)}
              </span>
            </div>

            {formData.price && formData.price > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-4">
                <span className="font-medium text-green-900">Profit Margin</span>
                <span className="text-xl font-bold text-green-900">
                  ${(formData.price - totalCOGS).toFixed(2)} ({(((formData.price - totalCOGS) / formData.price) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        )}
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
          {submitting ? 'Creating...' : 'Create Piece'}
        </button>
      </div>
    </form>
  )
}
