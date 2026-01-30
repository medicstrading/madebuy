'use client'

import { useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useAnalytics } from '@/hooks/useAnalytics'

interface CheckoutStartTrackerProps {
  tenantId: string
}

export function CheckoutStartTracker({ tenantId }: CheckoutStartTrackerProps) {
  const { trackStartCheckout } = useAnalytics(tenantId)
  const { items, totalAmount } = useCart()

  useEffect(() => {
    // Only track if cart has items
    if (items.length > 0) {
      trackStartCheckout(totalAmount, items.length)
    }
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
