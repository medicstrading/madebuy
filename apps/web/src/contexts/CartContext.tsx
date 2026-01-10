'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react'
import type { CartProduct } from '@madebuy/shared'

export interface CartItem {
  product: CartProduct
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: CartProduct, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Track cart for abandoned cart detection
async function trackCartForAbandonment(tenantId: string, items: CartItem[], total: number) {
  try {
    await fetch('/api/carts/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.primaryImage?.variants?.thumb?.url,
        })),
        total,
      }),
    })
  } catch (error) {
    // Silently fail - tracking should not affect user experience
    console.error('Cart tracking failed:', error)
  }
}

export function CartProvider({
  children,
  tenantId,
}: {
  children: ReactNode
  tenantId: string
}) {
  const [items, setItems] = useState<CartItem[]>([])
  const trackingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${tenantId}`)
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load cart:', error)
      }
    }
  }, [tenantId])

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem(`cart_${tenantId}`, JSON.stringify(items))
  }, [items, tenantId])

  // Track cart for abandoned cart detection (debounced)
  useEffect(() => {
    // Only track non-empty carts
    if (items.length === 0) return

    // Debounce tracking to avoid too many requests
    if (trackingTimeoutRef.current) {
      clearTimeout(trackingTimeoutRef.current)
    }

    const total = items.reduce(
      (sum, item) => sum + (item.product.price || 0) * item.quantity,
      0
    )

    trackingTimeoutRef.current = setTimeout(() => {
      trackCartForAbandonment(tenantId, items, total)
    }, 2000) // Wait 2 seconds after last change before tracking

    return () => {
      if (trackingTimeoutRef.current) {
        clearTimeout(trackingTimeoutRef.current)
      }
    }
  }, [items, tenantId])

  const addItem = useCallback((product: CartProduct, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)

      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [...prev, { product, quantity }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.product.id !== productId))
      return
    }

    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  )

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
