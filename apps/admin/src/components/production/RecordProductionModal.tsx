'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  Package,
  Layers,
  Calendar,
  FileText,
  Minus,
  Plus,
} from 'lucide-react'
import type { Piece, Material, PieceMaterialUsage } from '@madebuy/shared'

interface RecordProductionModalProps {
  isOpen: boolean
  onClose: () => void
  piece: Piece
  materials: Material[]
  onSuccess?: () => void
}

interface MaterialConsumption {
  material: Material
  usage: PieceMaterialUsage
  quantityNeeded: number
  hasStock: boolean
}

export function RecordProductionModal({
  isOpen,
  onClose,
  piece,
  materials,
  onSuccess,
}: RecordProductionModalProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build materials lookup map
  const materialsMap = new Map(materials.map(m => [m.id, m]))

  // Calculate material consumption preview
  const getConsumptionPreview = useCallback((): MaterialConsumption[] => {
    if (!piece.materialsUsed || piece.materialsUsed.length === 0) return []

    return piece.materialsUsed.map(usage => {
      const material = materialsMap.get(usage.materialId)
      const quantityNeeded = usage.quantity * quantity

      return {
        material: material!,
        usage,
        quantityNeeded,
        hasStock: material ? material.quantityInStock >= quantityNeeded : false,
      }
    }).filter(c => c.material) // Filter out any missing materials
  }, [piece.materialsUsed, quantity, materialsMap])

  const consumptionPreview = getConsumptionPreview()
  const hasInsufficientStock = consumptionPreview.some(c => !c.hasStock)
  const hasMaterials = piece.materialsUsed && piece.materialsUsed.length > 0

  // Calculate total cost
  const totalCost = consumptionPreview.reduce(
    (sum, c) => sum + (c.material.costPerUnit * c.quantityNeeded),
    0
  )

  const handleSubmit = async () => {
    if (!hasMaterials) {
      setError('This piece has no materials configured. Add materials first.')
      return
    }

    if (hasInsufficientStock) {
      setError('Insufficient materials. Check stock levels before recording.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/production-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieceId: piece.id,
          quantityProduced: quantity,
          productionDate: new Date(productionDate),
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record production')
      }

      // Success
      onSuccess?.()
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const incrementQuantity = () => setQuantity(q => q + 1)
  const decrementQuantity = () => setQuantity(q => Math.max(1, q - 1))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Log Production</h3>
                <p className="text-emerald-100 text-sm">{piece.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quantity Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Produced
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center text-lg font-semibold border-x border-gray-300 py-2 focus:outline-none"
                  min={1}
                />
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <span className="text-gray-500 text-sm">
                units of <span className="font-medium text-gray-700">{piece.name}</span>
              </span>
            </div>
          </div>

          {/* Material Consumption Preview */}
          {hasMaterials && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Materials Required
              </label>
              <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                {consumptionPreview.map((item) => (
                  <div
                    key={item.material.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      !item.hasStock ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className={`h-4 w-4 ${
                        item.hasStock ? 'text-gray-400' : 'text-red-500'
                      }`} />
                      <span className={`text-sm ${
                        item.hasStock ? 'text-gray-700' : 'text-red-700 font-medium'
                      }`}>
                        {item.material.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${
                        item.hasStock ? 'text-gray-900' : 'text-red-700'
                      }`}>
                        {item.quantityNeeded} {item.material.unit}
                      </span>
                      {!item.hasStock && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          Only {item.material.quantityInStock} available
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Total Cost */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-100">
                  <span className="text-sm font-medium text-gray-700">Material Cost</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${(totalCost / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Materials Warning */}
          {!hasMaterials && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No materials configured</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Add materials to this piece to track usage and costs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Production Date
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={e => setProductionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Batch #001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || hasInsufficientStock || !hasMaterials}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Record Production
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
