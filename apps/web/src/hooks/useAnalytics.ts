'use client'

import type { ProductWithMedia } from '@madebuy/shared'
import { useCallback, useEffect, useState } from 'react'
import {
  trackAddToCart,
  trackCheckoutStarted,
  trackProductView,
  trackPurchaseCompleted,
  trackRemoveFromCart,
} from '@/lib/analytics'

interface UseAnalyticsOptions {
  tenantId: string
}

export function useAnalytics(tenantId: string) {
  // Track product view with product details
  const handleTrackProductView = useCallback(
    (productId: string, productName?: string, price?: number) => {
      trackProductView(
        productId,
        productName || 'Unknown Product',
        price || 0,
        {
          tenant_id: tenantId,
        },
      )
    },
    [tenantId],
  )

  // Track add to cart with full product details
  const handleTrackAddToCart = useCallback(
    (productId: string, productName?: string, price?: number, quantity = 1) => {
      trackAddToCart(
        productId,
        productName || 'Unknown Product',
        price || 0,
        quantity,
        {
          tenant_id: tenantId,
        },
      )
    },
    [tenantId],
  )

  // Track remove from cart
  const handleTrackRemoveFromCart = useCallback(
    (productId: string, productName?: string, price?: number, quantity = 1) => {
      trackRemoveFromCart(
        productId,
        productName || 'Unknown Product',
        price || 0,
        quantity,
        {
          tenant_id: tenantId,
        },
      )
    },
    [tenantId],
  )

  // Track checkout started
  const handleTrackCheckoutStarted = useCallback(
    (cartTotal: number, itemCount: number) => {
      trackCheckoutStarted(cartTotal, itemCount, {
        tenant_id: tenantId,
      })
    },
    [tenantId],
  )

  // Track purchase completed
  const handleTrackPurchase = useCallback(
    (
      orderId: string,
      total: number,
      itemCount: number,
      paymentMethod: string,
    ) => {
      trackPurchaseCompleted(orderId, total, itemCount, paymentMethod, {
        tenant_id: tenantId,
      })
    },
    [tenantId],
  )

  return {
    trackProductView: handleTrackProductView,
    trackAddToCart: handleTrackAddToCart,
    trackRemoveFromCart: handleTrackRemoveFromCart,
    trackStartCheckout: handleTrackCheckoutStarted,
    trackPurchase: handleTrackPurchase,
  }
}
