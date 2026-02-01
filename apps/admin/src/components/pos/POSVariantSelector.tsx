'use client'

import type { Piece } from '@madebuy/shared'
import { X } from 'lucide-react'
import { useState } from 'react'

interface POSVariantSelectorProps {
  piece: Piece
  onSelect: (variantId: string, variantOptions: Record<string, string>) => void
  onClose: () => void
}

export function POSVariantSelector({
  piece,
  onSelect,
  onClose,
}: POSVariantSelectorProps) {
  if (!piece.variants || piece.variants.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{piece.name}</h2>
            <p className="text-sm text-gray-500">Select a variant</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Variants list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {piece.variants.map((variant) => {
              const price = variant.price ?? piece.price ?? 0
              const inStock =
                variant.stock === undefined ||
                variant.stock === null ||
                variant.stock > 0

              return (
                <button
                  key={variant.id}
                  onClick={() => onSelect(variant.id, variant.options)}
                  disabled={!inStock}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(variant.options).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-sm font-medium text-gray-900"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                      {variant.sku && (
                        <p className="text-xs text-gray-500 mt-1">
                          SKU: {variant.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${(price / 100).toFixed(2)}
                      </p>
                      {!inStock && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          Out of stock
                        </p>
                      )}
                      {inStock &&
                        variant.stock !== undefined &&
                        variant.stock !== null &&
                        variant.stock <= 5 && (
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            {variant.stock} left
                          </p>
                        )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
