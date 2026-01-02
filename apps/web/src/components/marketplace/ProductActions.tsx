'use client'

import { useState } from 'react'
import { ShoppingCart, Heart, Minus, Plus, Check } from 'lucide-react'

interface ProductActionsProps {
  productId: string
  price: number
}

const MARKETPLACE_CART_KEY = 'madebuy_marketplace_cart'

interface MarketplaceCartItem {
  productId: string
  quantity: number
  addedAt: number
}

function getMarketplaceCart(): MarketplaceCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(MARKETPLACE_CART_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addToMarketplaceCart(productId: string, quantity: number) {
  const cart = getMarketplaceCart()
  const existing = cart.find((item) => item.productId === productId)

  if (existing) {
    existing.quantity += quantity
    existing.addedAt = Date.now()
  } else {
    cart.push({ productId, quantity, addedAt: Date.now() })
  }

  localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(cart))
}

export function ProductActions({ productId, price }: ProductActionsProps) {
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  const handleAddToCart = () => {
    addToMarketplaceCart(productId, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const incrementQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, 99))
  }

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1))
  }

  const totalPrice = price * quantity

  return (
    <div className="space-y-4">
      {/* Quantity Picker */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-mb-slate">Quantity:</span>
        <div className="flex items-center rounded-lg border border-mb-sand">
          <button
            onClick={decrementQuantity}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-medium text-mb-slate">{quantity}</span>
          <button
            onClick={incrementQuantity}
            disabled={quantity >= 99}
            className="flex h-10 w-10 items-center justify-center text-mb-slate hover:bg-mb-cream disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {quantity > 1 && (
          <span className="text-sm text-mb-slate-light">
            Total: <span className="font-semibold text-mb-slate">${totalPrice.toFixed(2)}</span>
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={added}
          className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
            added
              ? 'bg-emerald-500 text-white'
              : 'bg-mb-blue text-white hover:bg-mb-blue-dark shadow-lg hover:shadow-xl'
          }`}
        >
          {added ? (
            <>
              <Check className="h-5 w-5" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </>
          )}
        </button>
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
            isFavorited
              ? 'border-rose-500 bg-rose-50 text-rose-500'
              : 'border-mb-sand bg-white text-mb-slate hover:border-rose-300 hover:text-rose-500'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Buy Now Button */}
      <button className="w-full rounded-full border-2 border-mb-slate py-3 text-sm font-semibold text-mb-slate hover:bg-mb-slate hover:text-white transition-all">
        Buy Now
      </button>
    </div>
  )
}
