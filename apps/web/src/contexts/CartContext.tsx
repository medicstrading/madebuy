'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { PieceWithMedia } from '@madebuy/shared'

export interface CartItem {
  piece: PieceWithMedia
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (piece: PieceWithMedia, quantity?: number) => void
  removeItem: (pieceId: string) => void
  updateQuantity: (pieceId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({
  children,
  tenantId,
}: {
  children: ReactNode
  tenantId: string
}) {
  const [items, setItems] = useState<CartItem[]>([])

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

  const addItem = (piece: PieceWithMedia, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.piece.id === piece.id)

      if (existing) {
        return prev.map(item =>
          item.piece.id === piece.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }

      return [...prev, { piece, quantity }]
    })
  }

  const removeItem = (pieceId: string) => {
    setItems(prev => prev.filter(item => item.piece.id !== pieceId))
  }

  const updateQuantity = (pieceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(pieceId)
      return
    }

    setItems(prev =>
      prev.map(item =>
        item.piece.id === pieceId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.piece.price || 0) * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
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
