'use client'

import type { Piece } from '@madebuy/shared'
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { POSCheckout } from './POSCheckout'

interface CartItem {
  piece: Piece
  quantity: number
  variantId?: string
  variantOptions?: Record<string, string>
  price: number
}

interface POSCartProps {
  items: CartItem[]
  onUpdateQuantity: (index: number, quantity: number) => void
  onRemoveItem: (index: number) => void
  onClearCart: () => void
}

export function POSCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: POSCartProps) {
  const [showCheckout, setShowCheckout] = useState(false)

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const handleCheckoutComplete = () => {
    setShowCheckout(false)
    onClearCart()
  }

  return (
    <>
      {/* Cart header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            <h2 className="font-bold text-gray-900 text-sm sm:text-base">
              Cart ({items.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
          </div>
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 active:text-red-800 font-medium flex items-center gap-1 touch-manipulation px-2 py-1 -mr-2"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center">
              <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm sm:text-base">
                Cart is empty
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Add products to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            {items.map((item, index) => (
              <div
                key={`${item.piece.id}-${item.variantId || 'default'}`}
                className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-2 sm:gap-3">
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                      {item.piece.name}
                    </h3>
                    {item.variantOptions && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.values(item.variantOptions).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      ${(item.price / 100).toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
                      <button
                        onClick={() =>
                          onUpdateQuantity(index, item.quantity - 1)
                        }
                        className="p-1.5 sm:p-1 hover:bg-white active:bg-gray-200 rounded transition-colors touch-manipulation"
                      >
                        <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                      </button>
                      <span className="w-7 sm:w-8 text-center font-semibold text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(index, item.quantity + 1)
                        }
                        className="p-1.5 sm:p-1 hover:bg-white active:bg-gray-200 rounded transition-colors touch-manipulation"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-1.5 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors group touch-manipulation"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 group-hover:text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Line total</span>
                  <span className="font-bold text-gray-900 text-sm">
                    ${((item.price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart footer - totals and checkout */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium text-sm sm:text-base">
              Subtotal
            </span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              ${(subtotal / 100).toFixed(2)}
            </span>
          </div>

          {/* Checkout button */}
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 touch-manipulation"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Checkout</span>
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <POSCheckout
          items={items}
          subtotal={subtotal}
          onComplete={handleCheckoutComplete}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  )
}
