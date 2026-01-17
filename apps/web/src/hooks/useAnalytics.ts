'use client'

type AnalyticsEvent =
  | 'view_product'
  | 'add_to_cart'
  | 'start_checkout'
  | 'complete_purchase'

interface TrackOptions {
  productId?: string
  orderId?: string
  metadata?: Record<string, any>
}

export function useAnalytics(tenantId: string) {
  const track = async (event: AnalyticsEvent, options?: TrackOptions) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          event,
          ...options,
        }),
      })
    } catch (error) {
      // Silently fail - analytics should not break the user experience
      console.error('Analytics tracking failed:', error)
    }
  }

  return {
    trackProductView: (productId: string) =>
      track('view_product', { productId }),
    trackAddToCart: (productId: string) => track('add_to_cart', { productId }),
    trackStartCheckout: () => track('start_checkout'),
    trackPurchase: (orderId: string) => track('complete_purchase', { orderId }),
  }
}
