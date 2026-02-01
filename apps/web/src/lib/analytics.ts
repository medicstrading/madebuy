/**
 * Web App Analytics Integration
 * Configures analytics for the MadeBuy web app
 */

import {
  type AnalyticsEventProperties,
  analytics,
  trackAddToCart as baseTrackAddToCart,
  trackCheckoutStarted as baseTrackCheckoutStarted,
  trackPageView as baseTrackPageView,
  trackProductView as baseTrackProductView,
  trackPurchaseCompleted as baseTrackPurchaseCompleted,
  trackRemoveFromCart as baseTrackRemoveFromCart,
  ConsoleAnalyticsProvider,
} from '@madebuy/shared'

// Initialize analytics with console provider for development
// This can be extended with GA4, Mixpanel, etc. in the future
if (typeof window !== 'undefined') {
  analytics.addProvider(new ConsoleAnalyticsProvider())
}

// Get tenant context from URL
function getTenantContext(): Pick<AnalyticsEventProperties, 'tenant_slug'> {
  if (typeof window === 'undefined') return {}

  const pathParts = window.location.pathname.split('/').filter(Boolean)
  if (pathParts.length > 0) {
    return { tenant_slug: pathParts[0] }
  }

  return {}
}

// Web-specific wrappers that automatically include tenant context

export function trackPageView(
  path: string,
  title?: string,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackPageView(path, title, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

export function trackProductView(
  productId: string,
  productName: string,
  price: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackProductView(productId, productName, price, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackAddToCart(productId, productName, price, quantity, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

export function trackRemoveFromCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackRemoveFromCart(productId, productName, price, quantity, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

export function trackCheckoutStarted(
  cartTotal: number,
  itemCount: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackCheckoutStarted(cartTotal, itemCount, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

export function trackPurchaseCompleted(
  orderId: string,
  total: number,
  itemCount: number,
  paymentMethod: string,
  additionalProps?: AnalyticsEventProperties,
): void {
  baseTrackPurchaseCompleted(orderId, total, itemCount, paymentMethod, {
    ...getTenantContext(),
    ...additionalProps,
  })
}

// Re-export analytics instance for custom events
export { analytics }
