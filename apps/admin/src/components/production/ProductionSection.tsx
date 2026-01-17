'use client'

import type { Material, Piece, ProductionRun } from '@madebuy/shared'
import { Layers, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ProductionHistoryList } from './ProductionHistoryList'
import { RecordProductionModal } from './RecordProductionModal'

interface ProductionSectionProps {
  piece: Piece
  materials: Material[]
  productionRuns: ProductionRun[]
}

export function ProductionSection({
  piece,
  materials,
  productionRuns,
}: ProductionSectionProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleDelete = useCallback(
    async (runId: string) => {
      const res = await fetch(`/api/production-runs/${runId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      router.refresh()
    },
    [router],
  )

  const hasMaterials = piece.materialsUsed && piece.materialsUsed.length > 0

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gray-400" />
          Production
        </h2>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Production
        </button>
      </div>

      {!hasMaterials && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          Add materials to this piece to track production and costs.
        </div>
      )}

      <ProductionHistoryList runs={productionRuns} onDelete={handleDelete} />

      <RecordProductionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        piece={piece}
        materials={materials}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
