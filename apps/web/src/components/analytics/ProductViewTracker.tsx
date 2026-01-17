'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface ProductViewTrackerProps {
  tenantId: string
  productId: string
}

export function ProductViewTracker({
  tenantId,
  productId,
}: ProductViewTrackerProps) {
  const { trackProductView } = useAnalytics(tenantId)

  useEffect(() => {
    trackProductView(productId)
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, trackProductView])

  return null
}
