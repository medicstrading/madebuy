'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  Calendar,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import type { ProductionRun } from '@madebuy/shared'

interface ProductionHistoryListProps {
  runs: ProductionRun[]
  onDelete?: (runId: string) => Promise<void>
  isLoading?: boolean
}

export function ProductionHistoryList({
  runs,
  onDelete,
  isLoading = false,
}: ProductionHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (runId: string) => {
    if (!onDelete) return
    if (!confirm('Delete this production record? Stock changes will be reversed.')) return

    setDeletingId(runId)
    try {
      await onDelete(runId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No production recorded yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {runs.map((run) => {
        const isExpanded = expandedId === run.id
        const isDeleting = deletingId === run.id

        return (
          <div key={run.id} className="py-3">
            {/* Main Row */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpandedId(isExpanded ? null : run.id)}
                className="flex items-center gap-3 text-left flex-1 hover:bg-gray-50 -ml-2 pl-2 py-1 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-700 font-semibold text-sm">
                      +{run.quantityProduced}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {run.quantityProduced} {run.quantityProduced === 1 ? 'unit' : 'units'} produced
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {formatDate(run.productionDate)}
                    {run.notes && (
                      <span className="text-gray-400">• {run.notes}</span>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">
                  ${(run.totalMaterialCost / 100).toFixed(2)}
                </span>
                {onDelete && (
                  <button
                    onClick={() => handleDelete(run.id)}
                    disabled={isDeleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete production record"
                  >
                    {isDeleting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-3 ml-9 bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Materials Used
                </div>
                {run.materialsUsed.map((material) => (
                  <div
                    key={material.materialId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-700">{material.materialName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        {material.quantityUsed} {material.unit}
                      </span>
                      <span className="text-gray-500 text-xs">
                        ${(material.totalCost / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Cost per unit</span>
                  <span className="font-semibold text-gray-900">
                    ${(run.costPerUnit / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
