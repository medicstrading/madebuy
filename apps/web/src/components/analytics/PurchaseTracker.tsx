'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface PurchaseTrackerProps {
  tenantId: string
  orderId?: string
}

export function PurchaseTracker({ tenantId, orderId }: PurchaseTrackerProps) {
  const { trackPurchase } = useAnalytics(tenantId)

  useEffect(() => {
    if (orderId) {
      trackPurchase(orderId)
    }
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, trackPurchase])

  return null
}
