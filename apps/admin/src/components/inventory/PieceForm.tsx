'use client'

import type { Material, PieceMaterialUsage } from '@madebuy/shared'
import {
  calculateCOGS,
  calculateProfitMargin,
  getMarginHealth,
  suggestPrice,
  TARGET_MARGINS,
} from '@madebuy/shared'
import {
  AlertTriangle,
  Calculator,
  Lightbulb,
  Loader2,
  Package,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useCelebrations } from '@/components/celebrations/CelebrationProvider'
import {
  FALLBACK_PRODUCT_CATEGORIES,
  useTenantCategories,
} from '@/hooks/useTenantCategories'

interface PieceFormProps {
  tenantId: string
  availableMaterials: Material[]
  piece?: any // For edit mode (future)
}

interface MaterialUsageEntry {
  materialId: string
  quantityUsed: number
}

interface FormErrors {
  name?: string
  category?: string
  form?: string
}

export function PieceForm({
  tenantId,
  availableMaterials,
  piece,
}: PieceFormProps) {
  const router = useRouter()
  const { checkCelebrations } = useCelebrations()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // Get dynamic categories based on maker type
  const { productCategories, isLoading: categoriesLoading } =
    useTenantCategories()

  // Use fetched categories or fallback to jewelry categories
  const categories =
    productCategories.length > 0
      ? productCategories
      : FALLBACK_PRODUCT_CATEGORIES

  // Piece data
  const [formData, setFormData] = useState({
    name: piece?.name || '',
    description: piece?.description || '',
    category: piece?.category || '',
    status: piece?.status || 'draft',
    price: piece?.price || 0,
    currency: piece?.currency || 'AUD',
    stock: piece?.stock || undefined,
    lowStockThreshold: piece?.lowStockThreshold || undefined,
    // Shipping dimensions
    shippingWeight: piece?.shippingWeight || undefined,
    shippingLength: piece?.shippingLength || undefined,
    shippingWidth: piece?.shippingWidth || undefined,
    shippingHeight: piece?.shippingHeight || undefined,
  })

  // Material usage tracking
  const [materialUsages, setMaterialUsages] = useState<MaterialUsageEntry[]>([])

  // Target margin for suggested pricing (default 50%)
  const [targetMargin, setTargetMargin] = useState<number>(
    TARGET_MARGINS.STANDARD,
  )

  // Convert material usages to PieceMaterialUsage format for COGS calculation
  const materialsUsedForCOGS: PieceMaterialUsage[] = useMemo(() => {
    return materialUsages
      .filter((u) => u.materialId && u.quantityUsed > 0)
      .map((u) => {
        const material = availableMaterials.find((m) => m.id === u.materialId)
        return {
          materialId: u.materialId,
          quantity: u.quantityUsed,
          unit: material?.unit || 'piece',
        }
      })
  }, [materialUsages, availableMaterials])

  // Calculate total COGS using the shared utility
  const totalCOGS = useMemo(() => {
    return calculateCOGS(materialsUsedForCOGS, availableMaterials)
  }, [materialsUsedForCOGS, availableMaterials])

  // Calculate profit margin
  const profitMargin = useMemo(() => {
    // Price in form is in dollars, COGS is in cents
    const priceInCents = formData.price ? formData.price * 100 : 0
    return calculateProfitMargin(priceInCents, totalCOGS)
  }, [formData.price, totalCOGS])

  // Get margin health status
  const marginHealth = useMemo(() => {
    return getMarginHealth(profitMargin)
  }, [profitMargin])

  // Calculate suggested price for target margin
  const suggestedPrice = useMemo(() => {
    const suggested = suggestPrice(totalCOGS, targetMargin)
    return suggested ? suggested / 100 : null // Convert cents to dollars
  }, [totalCOGS, targetMargin])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target
    const numericFields = [
      'price',
      'stock',
      'lowStockThreshold',
      'shippingWeight',
      'shippingLength',
      'shippingWidth',
      'shippingHeight',
    ]
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? value === ''
          ? undefined
          : parseFloat(value)
        : value,
    }))
  }

  const addMaterialUsage = () => {
    if (availableMaterials.length === 0) {
      setErrors((prev) => ({
        ...prev,
        form: 'No materials available. Please add materials first.',
      }))
      return
    }
    setErrors((prev) => ({ ...prev, form: undefined }))
    setMaterialUsages((prev) => [...prev, { materialId: '', quantityUsed: 0 }])
  }

  const removeMaterialUsage = (index: number) => {
    setMaterialUsages((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMaterialUsage = (
    index: number,
    field: 'materialId' | 'quantityUsed',
    value: string | number,
  ) => {
    setMaterialUsages((prev) =>
      prev.map((usage, i) => {
        if (i !== index) return usage
        return {
          ...usage,
          [field]:
            field === 'quantityUsed' ? parseFloat(value as string) || 0 : value,
        }
      }),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Piece name is required'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    // If there are validation errors, show them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      // Build piece data with materialsUsed for COGS
      const pieceData = {
        ...formData,
        // Include materialsUsed for automatic COGS calculation
        materialsUsed:
          materialsUsedForCOGS.length > 0 ? materialsUsedForCOGS : undefined,
      }

      // Create the piece
      const pieceResponse = await fetch('/api/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pieceData),
      })

      if (!pieceResponse.ok) {
        throw new Error('Failed to create piece')
      }

      const { piece: createdPiece } = await pieceResponse.json()

      // Record material usages for inventory deduction (separate from COGS tracking)
      // This reduces material stock when materials are actually used
      if (materialUsages.length > 0) {
        const validUsages = materialUsages.filter(
          (u) => u.materialId && u.quantityUsed > 0,
        )

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

      // Check for celebrations (first product milestone)
      await checkCelebrations()

      router.push('/dashboard/inventory')
      router.refresh()
    } catch (error) {
      console.error('Piece creation error:', error)
      setErrors({ form: 'Failed to create piece. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Piece Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => {
                handleChange(e)
                if (errors.name)
                  setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              placeholder="e.g., Sterling Silver Ring"
              className={`w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category *
            </label>
            {categoriesLoading ? (
              <div className="flex items-center gap-2 h-[42px] rounded-lg border border-gray-300 px-3 bg-gray-50">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">
                  Loading categories...
                </span>
              </div>
            ) : (
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => {
                  handleChange(e)
                  if (errors.category)
                    setErrors((prev) => ({ ...prev, category: undefined }))
                }}
                className={`w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 ${
                  errors.category
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            )}
            {errors.category ? (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Manage categories in Settings &rarr; Product Categories
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            <label
              htmlFor="stock"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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

          {/* Low Stock Threshold */}
          <div>
            <label
              htmlFor="lowStockThreshold"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Low Stock Alert
            </label>
            <input
              type="number"
              id="lowStockThreshold"
              name="lowStockThreshold"
              value={formData.lowStockThreshold || ''}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="e.g., 5"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Get notified when stock falls to or below this level
            </p>
          </div>
        </div>
      </div>

      {/* Shipping Dimensions */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Shipping Dimensions
            </h2>
            <p className="text-sm text-gray-600">
              Used for calculating shipping costs at checkout
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Weight */}
          <div>
            <label
              htmlFor="shippingWeight"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Weight (grams)
            </label>
            <input
              type="number"
              id="shippingWeight"
              name="shippingWeight"
              value={formData.shippingWeight || ''}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="e.g., 250"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Length */}
          <div>
            <label
              htmlFor="shippingLength"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Length (cm)
            </label>
            <input
              type="number"
              id="shippingLength"
              name="shippingLength"
              value={formData.shippingLength || ''}
              onChange={handleChange}
              min="0"
              step="0.5"
              placeholder="e.g., 20"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Width */}
          <div>
            <label
              htmlFor="shippingWidth"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Width (cm)
            </label>
            <input
              type="number"
              id="shippingWidth"
              name="shippingWidth"
              value={formData.shippingWidth || ''}
              onChange={handleChange}
              min="0"
              step="0.5"
              placeholder="e.g., 15"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Height */}
          <div>
            <label
              htmlFor="shippingHeight"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Height (cm)
            </label>
            <input
              type="number"
              id="shippingHeight"
              name="shippingHeight"
              value={formData.shippingHeight || ''}
              onChange={handleChange}
              min="0"
              step="0.5"
              placeholder="e.g., 5"
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Leave blank to use default dimensions for shipping quotes. Accurate
          dimensions help provide better shipping rates.
        </p>
      </div>

      {/* Material Usage */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Material Usage
            </h2>
            <p className="text-sm text-gray-600">
              Track materials used in this piece
            </p>
          </div>
          <button
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
              No materials added yet. Click &ldquo;Add Material&rdquo; to track
              material costs and calculate COGS.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {materialUsages.map((usage, index) => {
              const selectedMaterial = availableMaterials.find(
                (m) => m.id === usage.materialId,
              )
              const lineCost = selectedMaterial
                ? selectedMaterial.costPerUnit * usage.quantityUsed
                : 0

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex-1 grid gap-3 md:grid-cols-3">
                    {/* Material Selection */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <select
                        value={usage.materialId}
                        onChange={(e) =>
                          updateMaterialUsage(
                            index,
                            'materialId',
                            e.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select material</option>
                        {availableMaterials.map((material) => (
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
                        onChange={(e) =>
                          updateMaterialUsage(
                            index,
                            'quantityUsed',
                            e.target.value,
                          )
                        }
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {selectedMaterial && (
                        <p className="mt-1 text-xs text-gray-500">
                          ${selectedMaterial.costPerUnit.toFixed(2)} per{' '}
                          {selectedMaterial.unit}
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
                <span className="font-medium text-blue-900">
                  Total Cost of Goods Sold (COGS)
                </span>
              </div>
              <span className="text-xl font-bold text-blue-900">
                ${(totalCOGS / 100).toFixed(2)}
              </span>
            </div>

            {/* Profit Margin with Health Indicator */}
            {formData.price && formData.price > 0 && totalCOGS > 0 && (
              <div
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  marginHealth === 'healthy'
                    ? 'bg-green-50 border-green-200'
                    : marginHealth === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : marginHealth === 'low'
                        ? 'bg-orange-50 border-orange-200'
                        : marginHealth === 'negative'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {marginHealth === 'healthy' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : marginHealth === 'negative' || marginHealth === 'low' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <span
                      className={`font-medium ${
                        marginHealth === 'healthy'
                          ? 'text-green-900'
                          : marginHealth === 'warning'
                            ? 'text-yellow-900'
                            : marginHealth === 'low'
                              ? 'text-orange-900'
                              : marginHealth === 'negative'
                                ? 'text-red-900'
                                : 'text-gray-900'
                      }`}
                    >
                      Profit Margin
                    </span>
                    {marginHealth === 'low' && (
                      <p className="text-xs text-orange-600 mt-0.5">
                        Low margin - consider raising price
                      </p>
                    )}
                    {marginHealth === 'negative' && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Selling below cost!
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xl font-bold ${
                      marginHealth === 'healthy'
                        ? 'text-green-900'
                        : marginHealth === 'warning'
                          ? 'text-yellow-900'
                          : marginHealth === 'low'
                            ? 'text-orange-900'
                            : marginHealth === 'negative'
                              ? 'text-red-900'
                              : 'text-gray-900'
                    }`}
                  >
                    {profitMargin !== null
                      ? `${profitMargin.toFixed(1)}%`
                      : '-'}
                  </span>
                  <p className="text-sm text-gray-600">
                    ${((formData.price * 100 - totalCOGS) / 100).toFixed(2)}{' '}
                    profit
                  </p>
                </div>
              </div>
            )}

            {/* Suggested Pricing */}
            {totalCOGS > 0 && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-900">
                    Suggested Pricing
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-purple-800">
                    Target Margin:
                  </label>
                  <select
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="rounded border border-purple-300 px-2 py-1 text-sm bg-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value={TARGET_MARGINS.BUDGET}>30% (Budget)</option>
                    <option value={TARGET_MARGINS.STANDARD}>
                      50% (Standard)
                    </option>
                    <option value={TARGET_MARGINS.PREMIUM}>
                      60% (Premium)
                    </option>
                    <option value={TARGET_MARGINS.ARTISAN}>
                      70% (Artisan)
                    </option>
                    <option value={TARGET_MARGINS.EXCLUSIVE}>
                      80% (Exclusive)
                    </option>
                  </select>
                </div>
                {suggestedPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-800">
                      For {targetMargin}% margin, price at:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-900">
                        ${suggestedPrice.toFixed(2)}
                      </span>
                      <button
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            price: suggestedPrice,
                          }))
                        }
                        className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Error */}
      {errors.form && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{errors.form}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Piece'}
        </button>
      </div>
    </form>
  )
}
