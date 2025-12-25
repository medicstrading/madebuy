'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import type { PieceWithMedia } from '@madebuy/shared'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  piece: PieceWithMedia
  tenant: string
  disabled?: boolean
}

export function AddToCartButton({ piece, tenant, disabled }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addItem(piece, 1)
    setAdded(true)

    // Reset button after 2 seconds
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || added}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-lg font-medium transition-colors ${
        disabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500'
          : added
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {added ? (
        <>
          <Check className="h-5 w-5" />
          Added to Cart!
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          Add to Cart
        </>
      )}
    </button>
  )
}
