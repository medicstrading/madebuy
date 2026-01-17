'use client'

import type { BundleProductData } from '@madebuy/shared'
import {
  ArrowRight,
  ImageIcon,
  Minus,
  Package,
  Palette,
  Percent,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/lib/utils'
import { CartRecovery } from './CartRecovery'

interface CartContentProps {
  tenant: string
  tenantId: string
  freeShippingThreshold?: number // Amount in cents required for free shipping
}

// Type-safe accessor for bundle data (P2 type safety fix)
function getBundleData(product: {
  id: string
  _bundleData?: BundleProductData
}): BundleProductData | null {
  if (product.id.startsWith('bundle_') && product._bundleData) {
    return product._bundleData
  }
  return null
}

interface RecoveredItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export function CartContent({
  tenant,
  tenantId,
  freeShippingThreshold,
}: CartContentProps) {
  const { items, addItem, removeItem, updateQuantity, totalAmount } = useCart()
  const [recoveredDiscount, setRecoveredDiscount] = useState<string | null>(
    null,
  )

  // Handle cart recovery from email link
  const handleCartRecovered = useCallback(
    (recoveredItems: RecoveredItem[], discountCode?: string) => {
      // Add each recovered item to cart
      for (const item of recoveredItems) {
        // Create a minimal product object for the cart
        const product = {
          id: item.productId,
          name: item.name,
          price: item.price,
          slug: item.productId, // Will redirect to actual product
          primaryImage: item.imageUrl
            ? {
                id: 'recovered',
                variants: {
                  original: { url: item.imageUrl, width: 400, height: 400 },
                  thumb: { url: item.imageUrl, width: 100, height: 100 },
                },
              }
            : undefined,
        } as Parameters<typeof addItem>[0]

        addItem(product, { quantity: item.quantity })
      }

      // Store discount code if provided
      if (discountCode) {
        setRecoveredDiscount(discountCode)
        // Also store in sessionStorage for checkout
        sessionStorage.setItem('recoveryDiscount', discountCode)
      }
    },
    [addItem],
  )

  if (items.length === 0) {
    return (
      <>
        {/* Recovery handler - shows status when recovering */}
        <CartRecovery
          tenant={tenant}
          tenantId={tenantId}
          onRecovered={handleCartRecovered}
        />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
            <ShoppingBag className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-8">Add some items to get started</p>
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Start Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Recovery handler - shows status when recovering */}
      <CartRecovery
        tenant={tenant}
        tenantId={tenantId}
        onRecovered={handleCartRecovered}
      />

      {/* Discount code banner if recovered with discount */}
      {recoveredDiscount && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <Tag className="h-5 w-5 text-purple-500" />
          <div>
            <span className="text-purple-700 font-medium">
              Discount code <strong>{recoveredDiscount}</strong> will be applied
              at checkout!
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => {
              // Check if this is a bundle item (P2 type safety fix)
              const isBundle = item.product.id.startsWith('bundle_')
              const bundleData = getBundleData(
                item.product as { id: string; _bundleData?: BundleProductData },
              )
              const itemHref = isBundle
                ? `/${tenant}/bundle/${item.product.slug}`
                : `/${tenant}/product/${item.product.slug}`
              const hasPersonalization =
                item.personalization && item.personalization.length > 0
              const itemPrice =
                (item.product.price || 0) + (item.personalizationTotal || 0)

              return (
                <div
                  key={item.id}
                  className={`flex gap-4 rounded-2xl border bg-white p-4 hover:shadow-md transition-shadow ${
                    isBundle
                      ? 'border-purple-200 bg-purple-50/30'
                      : hasPersonalization
                        ? 'border-blue-200'
                        : 'border-gray-100'
                  }`}
                >
                  {/* Image */}
                  {item.product.primaryImage ? (
                    <Link
                      href={itemHref}
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
                        sizes="112px"
                      />
                      {isBundle && (
                        <div className="absolute top-1 left-1 bg-purple-500 text-white p-1 rounded-md">
                          <Package className="h-3 w-3" />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div
                      className={`flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-xl ${
                        isBundle
                          ? 'bg-gradient-to-br from-purple-100 to-blue-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      {isBundle ? (
                        <Package className="h-8 w-8 text-purple-300" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={itemHref}
                          className={`font-medium transition-colors ${
                            isBundle
                              ? 'text-purple-900 hover:text-purple-600'
                              : 'text-gray-900 hover:text-blue-600'
                          }`}
                        >
                          {item.product.name}
                        </Link>
                        {isBundle && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            <Package className="h-3 w-3" />
                            Bundle
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(
                          item.product.price,
                          item.product.currency,
                        )}{' '}
                        each
                      </p>
                      {/* Show bundle savings */}
                      {isBundle &&
                        bundleData &&
                        bundleData.discountPercent > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                            <Percent className="h-3 w-3" />
                            <span>Save {bundleData.discountPercent}%</span>
                          </div>
                        )}
                      {/* Show personalization details */}
                      {hasPersonalization && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Palette className="h-3 w-3" />
                            <span>Personalized</span>
                          </div>
                          <div className="pl-4 space-y-0.5">
                            {item.personalization?.map((p, idx) => (
                              <div key={idx} className="text-xs text-gray-500">
                                <span className="font-medium">
                                  {p.fieldName}:
                                </span>{' '}
                                {typeof p.value === 'boolean'
                                  ? p.value
                                    ? 'Yes'
                                    : 'No'
                                  : String(p.value)}
                                {p.priceAdjustment > 0 && (
                                  <span className="ml-1 text-blue-600">
                                    (+{formatCurrency(p.priceAdjustment / 100)})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-l-lg"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
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
                        onClick={() => removeItem(item.id)}
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
                        itemPrice * item.quantity,
                        item.product.currency,
                      )}
                    </p>
                    {/* Show original price for bundles */}
                    {isBundle && bundleData?.originalPrice && (
                      <p className="text-sm text-gray-400 line-through">
                        {formatCurrency(
                          (bundleData.originalPrice * item.quantity) / 100,
                        )}
                      </p>
                    )}
                    {/* Show personalization price breakdown */}
                    {hasPersonalization &&
                      item.personalizationTotal &&
                      item.personalizationTotal > 0 && (
                        <p className="text-xs text-blue-600">
                          Includes{' '}
                          {formatCurrency(
                            (item.personalizationTotal / 100) * item.quantity,
                          )}{' '}
                          personalization
                        </p>
                      )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Order Summary
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {/* Free Shipping Progress */}
              {freeShippingThreshold && freeShippingThreshold > 0 && (
                <FreeShippingProgress
                  threshold={freeShippingThreshold}
                  currentAmount={Math.round(totalAmount * 100)} // Convert to cents
                />
              )}

              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                {freeShippingThreshold &&
                Math.round(totalAmount * 100) >= freeShippingThreshold ? (
                  <span className="font-medium text-green-600">FREE</span>
                ) : (
                  <span className="text-gray-400">Calculated at checkout</span>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </span>
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
    </>
  )
}

/**
 * Free Shipping Progress Bar Component
 * Shows progress toward free shipping threshold
 */
function FreeShippingProgress({
  threshold,
  currentAmount,
}: {
  threshold: number // in cents
  currentAmount: number // in cents
}) {
  const amountUntilFree = Math.max(0, threshold - currentAmount)
  const progress = Math.min(100, (currentAmount / threshold) * 100)
  const qualifies = currentAmount >= threshold

  // Format amount in dollars
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100)
  }

  if (qualifies) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            You qualify for free shipping!
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Add {formatAmount(amountUntilFree)} more for free shipping!
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-blue-600">
        {formatAmount(currentAmount)} / {formatAmount(threshold)}
      </p>
    </div>
  )
}
