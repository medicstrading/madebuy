'use client'

import type { Piece } from '@madebuy/shared'
import { Image as ImageIcon, Plus } from 'lucide-react'
import { useState } from 'react'
import { POSVariantSelector } from './POSVariantSelector'

interface POSProductTileProps {
  piece: Piece
  onAddToCart: (
    piece: Piece,
    variantId?: string,
    variantOptions?: Record<string, string>,
  ) => void
}

export function POSProductTile({ piece, onAddToCart }: POSProductTileProps) {
  const [showVariants, setShowVariants] = useState(false)

  const handleClick = () => {
    if (piece.hasVariants && piece.variants && piece.variants.length > 0) {
      setShowVariants(true)
    } else {
      onAddToCart(piece)
    }
  }

  const handleVariantSelect = (
    variantId: string,
    variantOptions: Record<string, string>,
  ) => {
    onAddToCart(piece, variantId, variantOptions)
    setShowVariants(false)
  }

  // Get first media URL if available
  const imageUrl =
    piece.mediaIds && piece.mediaIds.length > 0
      ? `/api/media/${piece.mediaIds[0]}/url`
      : null

  return (
    <>
      <button
        onClick={handleClick}
        className="group relative bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all duration-200 active:scale-95 touch-manipulation flex flex-col h-full min-h-[160px] sm:min-h-[180px]"
      >
        {/* Image */}
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={piece.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <ImageIcon className="h-12 w-12 text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 text-left mb-1">
            {piece.name}
          </h3>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-base sm:text-lg font-bold text-gray-900">
              ${((piece.price ?? 0) / 100).toFixed(2)}
            </span>
            <div className="bg-blue-500 text-white p-1.5 sm:p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          {piece.hasVariants && (
            <span className="text-xs text-gray-500 mt-1 text-left">
              Multiple options
            </span>
          )}
        </div>

        {/* Stock indicator */}
        {piece.stock !== undefined &&
          piece.stock !== null &&
          piece.stock <= 5 && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
              {piece.stock} left
            </div>
          )}
      </button>

      {/* Variant selector modal */}
      {showVariants && (
        <POSVariantSelector
          piece={piece}
          onSelect={handleVariantSelect}
          onClose={() => setShowVariants(false)}
        />
      )}
    </>
  )
}
