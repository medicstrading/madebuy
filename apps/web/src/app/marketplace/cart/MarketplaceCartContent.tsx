'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ImageIcon, Loader2 } from 'lucide-react'

const MARKETPLACE_CART_KEY = 'madebuy_marketplace_cart'

interface MarketplaceCartItem {
  productId: string
  quantity: number
  addedAt: number
}

interface ProductData {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  stock?: number
  image?: string
  seller: {
    tenantId: string
    businessName: string
  }
}

interface CartItemWithProduct extends MarketplaceCartItem {
  product?: ProductData
  loading?: boolean
  error?: string
}

function formatCurrency(amount: number | undefined, currency: string = 'AUD'): string {
  if (amount === undefined) return 'N/A'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function MarketplaceCartContent() {
  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)

  // Load cart from localStorage and fetch product data
  useEffect(() => {
    async function loadCart() {
      try {
        const stored = localStorage.getItem(MARKETPLACE_CART_KEY)
        if (!stored) {
          setLoading(false)
          return
        }

        const cartItems: MarketplaceCartItem[] = JSON.parse(stored)
        if (!cartItems.length) {
          setLoading(false)
          return
        }

        // Set initial items with loading state
        setItems(cartItems.map(item => ({ ...item, loading: true })))

        // Fetch product data for all items
        const productIds = cartItems.map(item => item.productId)
        const response = await fetch('/api/marketplace/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: productIds }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const { products } = await response.json()
        const productMap = new Map(products.map((p: ProductData) => [p.id, p]))

        // Update items with product data
        setItems(cartItems.map(item => ({
          ...item,
          product: productMap.get(item.productId),
          loading: false,
          error: productMap.get(item.productId) ? undefined : 'Product not found',
        })))
      } catch (error) {
        console.error('Failed to load cart:', error)
        setItems(prev => prev.map(item => ({ ...item, loading: false, error: 'Failed to load' })))
      } finally {
        setLoading(false)
      }
    }

    loadCart()
  }, [])

  // Save cart to localStorage
  const saveCart = (newItems: CartItemWithProduct[]) => {
    const cartData = newItems.map(({ productId, quantity, addedAt }) => ({
      productId,
      quantity,
      addedAt,
    }))
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(cartData))
    setItems(newItems)
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }
    saveCart(items.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ))
  }

  const removeItem = (productId: string) => {
    saveCart(items.filter(item => item.productId !== productId))
  }

  const validItems = items.filter(item => item.product && !item.error)
  const totalAmount = validItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-500">Loading your cart...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add some items to get started</p>
        <Link
          href="/marketplace/browse"
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
              key={item.productId}
              className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md transition-shadow"
            >
              {item.loading ? (
                <div className="flex items-center justify-center w-full py-4">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              ) : item.error || !item.product ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-gray-500">Product unavailable</span>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  {/* Image */}
                  {item.product.image ? (
                    <Link
                      href={`/marketplace/product/${item.product.id}`}
                      className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100"
                    >
                      <Image
                        src={item.product.image}
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
                        href={`/marketplace/product/${item.product.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(item.product.price, item.product.currency)} each
                      </p>
                      <p className="text-xs text-gray-400">
                        by {item.product.seller.businessName}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center rounded-lg border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-l-lg"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded-r-lg disabled:opacity-50"
                          aria-label="Increase quantity"
                          disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
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
                      {formatCurrency(item.product.price * item.quantity, item.product.currency)}
                    </p>
                  </div>
                </>
              )}
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
              <span>Subtotal ({validItems.length} items)</span>
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

          <button
            disabled={validItems.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-4 text-base font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
