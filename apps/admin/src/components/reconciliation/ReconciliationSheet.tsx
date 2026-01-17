'use client'

import type {
  InventoryReconciliation,
  Material,
  ReconciliationItem,
  ReconciliationReason,
} from '@madebuy/shared'
import { RECONCILIATION_REASON_LABELS } from '@madebuy/shared'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardCheck,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ReconciliationSheetProps {
  isOpen: boolean
  onClose: () => void
  materials: Material[]
  onComplete?: () => void
}

type Step = 'loading' | 'counting' | 'review'

export function ReconciliationSheet({
  isOpen,
  onClose,
  materials,
  onComplete,
}: ReconciliationSheetProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [reconciliation, setReconciliation] =
    useState<InventoryReconciliation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize or resume reconciliation
  useEffect(() => {
    if (!isOpen) return

    const initReconciliation = async () => {
      setStep('loading')
      setError(null)

      try {
        // Check for existing in-progress reconciliation
        const listRes = await fetch(
          '/api/reconciliations?status=in_progress&limit=1',
        )
        const listData = await listRes.json()

        if (listData.reconciliations?.length > 0) {
          // Resume existing
          setReconciliation(listData.reconciliations[0])
          setStep('counting')
          return
        }

        // Create new reconciliation
        const createRes = await fetch('/api/reconciliations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!createRes.ok) throw new Error('Failed to start reconciliation')

        const createData = await createRes.json()
        const newRecon = createData.reconciliation

        // Add all materials to the reconciliation
        for (const material of materials) {
          await fetch(`/api/reconciliations/${newRecon.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemType: 'material',
              itemId: material.id,
            }),
          })
        }

        // Fetch updated reconciliation with items
        const refreshRes = await fetch(`/api/reconciliations/${newRecon.id}`)
        const refreshData = await refreshRes.json()
        setReconciliation(refreshData.reconciliation)
        setStep('counting')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start')
        setStep('counting')
      }
    }

    initReconciliation()
  }, [isOpen, materials])

  // Update item quantity
  const updateItemQuantity = async (
    itemId: string,
    actualQuantity: number,
    reason?: ReconciliationReason,
    notes?: string,
  ) => {
    if (!reconciliation) return

    try {
      const res = await fetch(
        `/api/reconciliations/${reconciliation.id}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualQuantity,
            adjustmentReason: reason,
            notes,
          }),
        },
      )

      if (!res.ok) throw new Error('Failed to update')

      const data = await res.json()
      setReconciliation(data.reconciliation)
    } catch (_err) {
      setError('Failed to update count')
    }
  }

  // Complete reconciliation
  const handleComplete = async () => {
    if (!reconciliation) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/reconciliations/${reconciliation.id}/complete`,
        {
          method: 'POST',
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to complete')
      }

      onComplete?.()
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cancel reconciliation
  const handleCancel = async () => {
    if (!reconciliation) {
      onClose()
      return
    }

    if (!confirm('Cancel this stock count? No changes will be saved.')) return

    try {
      await fetch(`/api/reconciliations/${reconciliation.id}/cancel`, {
        method: 'POST',
      })
    } catch {
      // Ignore errors on cancel
    }

    onClose()
    router.refresh()
  }

  // Filter items by search
  const filteredItems =
    reconciliation?.items.filter((item) =>
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || []

  // Count discrepancies
  const discrepancyCount =
    reconciliation?.items.filter((i) => i.discrepancy !== 0).length || 0

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Stock Count
                </h3>
                <p className="text-blue-100 text-sm">
                  {reconciliation?.items.length || 0} materials to count
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Preparing stock count...</p>
            </div>
          </div>
        )}

        {/* Counting Step */}
        {step === 'counting' && reconciliation && (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <ReconciliationItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(qty, reason, notes) =>
                      updateItemQuantity(item.id, qty, reason, notes)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600">
                    {discrepancyCount === 0 ? (
                      <span className="text-green-600 font-medium">
                        All counts match
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        {discrepancyCount}{' '}
                        {discrepancyCount === 1
                          ? 'discrepancy'
                          : 'discrepancies'}
                      </span>
                    )}
                  </div>
                  {reconciliation.totalAdjustmentValue !== 0 && (
                    <div className="text-xs text-gray-500">
                      Adjustment value: $
                      {Math.abs(
                        reconciliation.totalAdjustmentValue / 100,
                      ).toFixed(2)}
                      {reconciliation.totalAdjustmentValue > 0
                        ? ' (gain)'
                        : ' (loss)'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review & Complete
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Review Step */}
        {step === 'review' && reconciliation && (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Review Changes
              </h4>

              {discrepancyCount === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">
                    All stock counts match!
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    No adjustments needed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reconciliation.items
                    .filter((i) => i.discrepancy !== 0)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-4 ${
                          item.discrepancy > 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package
                              className={`h-4 w-4 ${
                                item.discrepancy > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            />
                            <span className="font-medium text-gray-900">
                              {item.itemName}
                            </span>
                          </div>
                          <span
                            className={`font-semibold ${
                              item.discrepancy > 0
                                ? 'text-green-700'
                                : 'text-red-700'
                            }`}
                          >
                            {item.discrepancy > 0 ? '+' : ''}
                            {item.discrepancy} {item.unit}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Expected: {item.expectedQuantity} → Actual:{' '}
                          {item.actualQuantity}
                          {item.adjustmentReason && (
                            <span className="ml-2 text-gray-500">
                              (
                              {
                                RECONCILIATION_REASON_LABELS[
                                  item.adjustmentReason
                                ]
                              }
                              )
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Review Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('counting')}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Back to Counting
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Complete & Update Stock
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// Individual item row component
function ReconciliationItemRow({
  item,
  onUpdate,
}: {
  item: ReconciliationItem
  onUpdate: (qty: number, reason?: ReconciliationReason, notes?: string) => void
}) {
  const [actualQty, setActualQty] = useState(item.actualQuantity)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState<ReconciliationReason | undefined>(
    item.adjustmentReason,
  )

  const discrepancy = actualQty - item.expectedQuantity
  const hasDiscrepancy = discrepancy !== 0

  const handleBlur = () => {
    if (actualQty !== item.actualQuantity) {
      onUpdate(actualQty, reason)
      if (hasDiscrepancy && !reason) {
        setShowReason(true)
      }
    }
  }

  const handleReasonChange = (newReason: ReconciliationReason) => {
    setReason(newReason)
    onUpdate(actualQty, newReason)
    setShowReason(false)
  }

  return (
    <div className={`px-4 py-3 ${hasDiscrepancy ? 'bg-amber-50' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">
              {item.itemName}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Expected: {item.expectedQuantity} {item.unit}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={actualQty}
            onChange={(e) =>
              setActualQty(Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            onBlur={handleBlur}
            className={`w-20 px-3 py-1.5 text-sm text-center border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasDiscrepancy
                ? 'border-amber-400 bg-amber-100'
                : 'border-gray-300'
            }`}
          />
          <span className="text-xs text-gray-500 w-12">{item.unit}</span>
        </div>

        {hasDiscrepancy && (
          <span
            className={`text-sm font-medium ${
              discrepancy > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {discrepancy > 0 ? '+' : ''}
            {discrepancy}
          </span>
        )}
      </div>

      {/* Reason selector */}
      {showReason && hasDiscrepancy && (
        <div className="mt-3 ml-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reason for discrepancy:
          </label>
          <select
            value={reason || ''}
            onChange={(e) =>
              handleReasonChange(e.target.value as ReconciliationReason)
            }
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select reason...</option>
            {Object.entries(RECONCILIATION_REASON_LABELS).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {/* Show reason badge if set */}
      {item.adjustmentReason && !showReason && (
        <div className="mt-2 ml-6">
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
            {RECONCILIATION_REASON_LABELS[item.adjustmentReason]}
          </span>
        </div>
      )}
    </div>
  )
}
