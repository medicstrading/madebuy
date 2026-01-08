'use client'

import { useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'

interface CheckoutStartTrackerProps {
  tenantId: string
}

export function CheckoutStartTracker({ tenantId }: CheckoutStartTrackerProps) {
  const { trackStartCheckout } = useAnalytics(tenantId)

  useEffect(() => {
    trackStartCheckout()
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
