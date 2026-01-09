'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingBag, ArrowRight, ImageIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/contexts/CartContext'

interface MiniCartPreviewProps {
  items: CartItem[]
  totalAmount: number
  tenant: string
  isOpen: boolean
  onClose: () => void
  addedProductId?: string
}

export function MiniCartPreview({
  items,
  totalAmount,
  tenant,
  isOpen,
  onClose,
  addedProductId,
}: MiniCartPreviewProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [isOpen, onClose])

  // Handle close animation
  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(onClose, 200)
  }

  if (!isOpen && !isAnimating) return null

  // Get recently added item for highlight
  const recentlyAdded = items.find((item) => item.product.id === addedProductId)

  // Show up to 3 items in preview
  const previewItems = items.slice(0, 3)
  const remainingCount = items.length - 3

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${
          isOpen && isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Mini Cart Panel */}
      <div
        className={`fixed right-4 top-20 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 transform transition-all duration-200 ${
          isOpen && isAnimating
            ? 'translate-x-0 opacity-100'
            : 'translate-x-4 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <ShoppingBag className="h-4 w-4 text-green-600" />
            </div>
            <span className="font-medium text-gray-900">Added to Cart!</span>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recently Added Item (highlighted) */}
        {recentlyAdded && (
          <div className="p-4 bg-green-50/50 border-b border-gray-100">
            <div className="flex gap-3">
              {recentlyAdded.product.primaryImage ? (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={
                      recentlyAdded.product.primaryImage.variants.thumb?.url ||
                      recentlyAdded.product.primaryImage.variants.original.url
                    }
                    alt={recentlyAdded.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <ImageIcon className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {recentlyAdded.product.name}
                </p>
                <p className="text-sm text-gray-500">
                  Qty: {recentlyAdded.quantity}
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(
                    recentlyAdded.product.price
                      ? recentlyAdded.product.price * recentlyAdded.quantity
                      : undefined,
                    recentlyAdded.product.currency
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other Items in Cart */}
        {items.length > 1 && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">
              Also in your cart
            </p>
            <div className="space-y-3">
              {previewItems
                .filter((item) => item.product.id !== addedProductId)
                .slice(0, 2)
                .map((item) => (
                  <div key={item.product.id} className="flex gap-3 items-center">
                    {item.product.primaryImage ? (
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={
                            item.product.primaryImage.variants.thumb?.url ||
                            item.product.primaryImage.variants.original.url
                          }
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <ImageIcon className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              {remainingCount > 0 && (
                <p className="text-xs text-gray-500">
                  +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary & Actions */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">
              Subtotal ({items.reduce((sum, i) => sum + i.quantity, 0)} items)
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/${tenant}/cart`}
              onClick={handleClose}
              className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Cart
            </Link>
            <Link
              href={`/${tenant}/checkout`}
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
