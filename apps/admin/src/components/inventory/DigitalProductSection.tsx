'use client'

import { Download } from 'lucide-react'
import { DigitalProductEditor } from '@/components/digital'
import type { DigitalProductConfig } from '@madebuy/shared'

interface DigitalProductSectionProps {
  pieceId: string
  digital?: DigitalProductConfig
}

export function DigitalProductSection({ pieceId, digital }: DigitalProductSectionProps) {
  // The DigitalProductEditor handles its own API calls internally
  // onUpdate is just for parent state sync which we don't need here
  const handleUpdate = () => {
    // Optional: could trigger a router.refresh() here if needed
  }

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Download className="h-5 w-5 text-gray-400" />
        Digital Product
        <span className="text-xs font-normal text-gray-400 ml-2">
          Sell downloadable files
        </span>
      </h2>

      <DigitalProductEditor
        pieceId={pieceId}
        digital={digital}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
