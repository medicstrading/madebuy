'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { ProductWithMedia, PieceWithMedia } from '@madebuy/shared'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  product: ProductWithMedia | PieceWithMedia
  tenantId: string
  disabled?: boolean
}

export function AddToCartButton({ product, tenantId, disabled }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const { trackAddToCart } = useAnalytics(tenantId)
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    // Cast to ProductWithMedia for cart compatibility
    addItem(product as ProductWithMedia, 1)
    setAdded(true)

    // Track add to cart event
    trackAddToCart(product.id)

    // Reset button state after 2 seconds
    setTimeout(() => {
      setAdded(false)
    }, 2000)
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || added}
      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : added
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {added ? (
        <>
          <Check className="w-5 h-5" />
          Added to Cart
        </>
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          Add to Cart
        </>
      )}
    </button>
  )
}
