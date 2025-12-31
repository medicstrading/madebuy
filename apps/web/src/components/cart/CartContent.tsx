'use client'

import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ImageIcon } from 'lucide-react'

interface CartContentProps {
  tenant: string
  tenantId: string
}

export function CartContent({ tenant, tenantId }: CartContentProps) {
  const { items, removeItem, updateQuantity, totalAmount } = useCart()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add some items to get started</p>
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Start Shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-12 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md transition-shadow"
            >
              {/* Image */}
              {item.product.primaryImage ? (
                <Link
                  href={`/${tenant}/${item.product.slug}`}
                  className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100"
                >
                  <Image
                    src={
                      item.product.primaryImage.variants.thumb?.url ||
                      item.product.primaryImage.variants.original.url
                    }
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </Link>
              ) : (
                <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between py-1">
                <div>
                  <Link
                    href={`/${tenant}/${item.product.slug}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatCurrency(item.product.price, item.product.currency)} each
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-l-lg"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-r-lg disabled:opacity-50"
                      aria-label="Increase quantity"
                      disabled={
                        item.product.stock !== undefined &&
                        item.quantity >= item.product.stock
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove from cart"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex flex-col items-end justify-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(
                    item.product.price ? item.product.price * item.quantity : undefined,
                    item.product.currency
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

          <div className="space-y-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({items.length} items)</span>
              <span className="font-medium text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="text-gray-400">Calculated at checkout</span>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <Link
            href={`/${tenant}/checkout`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-4 text-base font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 text-center text-xs text-gray-400">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
