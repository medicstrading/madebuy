'use client'

import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Plus, Minus } from 'lucide-react'

interface CartContentProps {
  tenant: string
  tenantId: string
}

export function CartContent({ tenant, tenantId }: CartContentProps) {
  const { items, removeItem, updateQuantity, totalAmount } = useCart()

  if (items.length === 0) {
    return (
      <div className="mt-8 text-center">
        <p className="text-gray-600">Your cart is empty.</p>
        <Link
          href={`/${tenant}`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.piece.id}
              className="flex gap-4 rounded-lg bg-white p-4 shadow-sm"
            >
              {/* Image */}
              {item.piece.primaryImage ? (
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={
                      item.piece.primaryImage.variants.thumb?.url ||
                      item.piece.primaryImage.variants.original.url
                    }
                    alt={item.piece.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/${tenant}/${item.piece.slug}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {item.piece.name}
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatCurrency(item.piece.price, item.piece.currency)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.piece.id, item.quantity - 1)}
                      className="rounded-md border border-gray-300 p-1 hover:bg-gray-100"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.piece.id, item.quantity + 1)}
                      className="rounded-md border border-gray-300 p-1 hover:bg-gray-100"
                      aria-label="Increase quantity"
                      disabled={
                        item.piece.stock !== undefined &&
                        item.quantity >= item.piece.stock
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.piece.id)}
                    className="text-red-600 hover:text-red-700"
                    aria-label="Remove from cart"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex flex-col items-end justify-between">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(
                    item.piece.price ? item.piece.price * item.quantity : undefined,
                    item.piece.currency
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <Link
            href={`/${tenant}/checkout`}
            className="mt-6 block w-full rounded-lg bg-blue-600 px-6 py-3 text-center text-white hover:bg-blue-700"
          >
            Proceed to Checkout
          </Link>

          <p className="mt-4 text-center text-sm text-gray-600">
            Shipping calculated at checkout
          </p>
        </div>
      </div>
    </div>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}
