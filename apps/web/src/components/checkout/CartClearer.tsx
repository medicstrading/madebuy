'use client'

import { useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'

/**
 * PAY-02: Client component that clears the cart on mount
 * Used on the checkout success page to ensure cart is cleared after payment
 */
export function CartClearer() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return null
}
