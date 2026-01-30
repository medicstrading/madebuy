'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface PurchaseTrackerProps {
  tenantId: string
  orderId?: string
  total?: number
  itemCount?: number
  paymentMethod?: string
}

export function PurchaseTracker({
  tenantId,
  orderId,
  total,
  itemCount,
  paymentMethod = 'stripe',
}: PurchaseTrackerProps) {
  const { trackPurchase } = useAnalytics(tenantId)

  useEffect(() => {
    if (orderId && total !== undefined && itemCount !== undefined) {
      trackPurchase(orderId, total, itemCount, paymentMethod)
    }
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  return null
}
