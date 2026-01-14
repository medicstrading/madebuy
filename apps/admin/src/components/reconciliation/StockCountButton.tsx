'use client'

import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { ReconciliationSheet } from './ReconciliationSheet'
import type { Material } from '@madebuy/shared'

interface StockCountButtonProps {
  materials: Material[]
}

export function StockCountButton({ materials }: StockCountButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsSheetOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <ClipboardCheck className="h-4 w-4" />
        Stock Count
      </button>

      <ReconciliationSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        materials={materials}
      />
    </>
  )
}
