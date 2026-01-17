'use client'

import type { CartProduct, PersonalizationValue } from '@madebuy/shared'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface CartItem {
  id: string // Unique cart item ID (product ID + personalization hash)
  product: CartProduct
  quantity: number
  personalization?: PersonalizationValue[] // Customer's personalization entries
  personalizationTotal?: number // Total price adjustment from personalization
}

interface AddItemOptions {
  quantity?: number
  personalization?: PersonalizationValue[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: CartProduct, options?: AddItemOptions) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Generate unique cart item ID based on product + personalization
function generateCartItemId(
  productId: string,
  personalization?: PersonalizationValue[],
): string {
  if (!personalization || personalization.length === 0) {
    return productId
  }
  // Create hash from personalization values to distinguish items
  const personalizationKey = personalization
    .map((p) => `${p.fieldId}:${String(p.value)}`)
    .sort()
    .join('|')
  return `${productId}-${btoa(personalizationKey).slice(0, 12)}`
}

// Calculate total price adjustment from personalization
function calculatePersonalizationTotal(
  personalization?: PersonalizationValue[],
): number {
  if (!personalization || personalization.length === 0) return 0
  return personalization.reduce((sum, p) => sum + (p.priceAdjustment || 0), 0)
}

// Track cart for abandoned cart detection
async function trackCartForAbandonment(
  tenantId: string,
  items: CartItem[],
  total: number,
) {
  try {
    await fetch('/api/carts/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        items: items.map((item) => ({
          productId: item.product.id,
          cartItemId: item.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.primaryImage?.variants?.thumb?.url,
          personalization: item.personalization,
          personalizationTotal: item.personalizationTotal,
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
      (sum, item) =>
        sum +
        ((item.product.price || 0) + (item.personalizationTotal || 0)) *
          item.quantity,
      0,
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

  const addItem = useCallback(
    (product: CartProduct, options?: AddItemOptions) => {
      const quantity = options?.quantity ?? 1
      const personalization = options?.personalization
      const cartItemId = generateCartItemId(product.id, personalization)
      const personalizationTotal =
        calculatePersonalizationTotal(personalization)

      setItems((prev) => {
        const existing = prev.find((item) => item.id === cartItemId)

        if (existing) {
          return prev.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        }

        return [
          ...prev,
          {
            id: cartItemId,
            product,
            quantity,
            personalization,
            personalizationTotal,
          },
        ]
      })
    },
    [],
  )

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== cartItemId))
  }, [])

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== cartItemId))
      return
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce(
    (sum, item) =>
      sum +
      ((item.product.price || 0) + (item.personalizationTotal || 0)) *
        item.quantity,
    0,
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
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
