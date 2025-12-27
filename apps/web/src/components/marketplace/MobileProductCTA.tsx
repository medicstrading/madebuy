'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Heart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import type { PieceWithMedia } from '@madebuy/shared'

interface MobileProductCTAProps {
  piece: PieceWithMedia
  tenant: string
}

export function MobileProductCTA({ piece, tenant }: MobileProductCTAProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA bar when user scrolls past 300px
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAddToCart = () => {
    if (!piece.price || piece.status !== 'available') {
      return
    }

    addItem(piece, 1)
    setAdded(true)

    // Reset button after 2 seconds
    setTimeout(() => setAdded(false), 2000)
  }

  const canAddToCart = piece.price && piece.status === 'available'
  const isSold = piece.status === 'sold'
  const isReserved = piece.status === 'reserved'

  return (
    <div
      className={`
        lg:hidden fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-gray-200 shadow-2xl
        transition-transform duration-300
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Price */}
        <div>
          <div className="text-xs text-gray-500">Price</div>
          <div className="text-xl font-bold text-gray-900">
            ${piece.price?.toFixed(2)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Wishlist */}
          <button
            className="flex items-center justify-center w-10 h-10 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
            onClick={() => {
              // TODO: Implement wishlist functionality
              console.log('Add to wishlist')
            }}
            aria-label="Add to wishlist"
          >
            <Heart size={20} />
          </button>

          {/* Add to Cart */}
          {canAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={added}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                added
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          )}

          {isSold && (
            <div className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg font-medium">
              Sold Out
            </div>
          )}

          {isReserved && (
            <div className="bg-yellow-100 text-yellow-800 px-6 py-2 rounded-lg font-medium">
              Reserved
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
