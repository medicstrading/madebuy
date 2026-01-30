'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface ProductViewTrackerProps {
  tenantId: string
  productId: string
  productName?: string
  price?: number
}

export function ProductViewTracker({
  tenantId,
  productId,
  productName,
  price,
}: ProductViewTrackerProps) {
  const { trackProductView } = useAnalytics(tenantId)

  useEffect(() => {
    trackProductView(productId, productName, price)
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return null
}
