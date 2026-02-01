/* eslint-env browser */
/**
 * Analytics Event Tracking
 * Provider-agnostic analytics system ready for GA4, Mixpanel, or other providers
 */

export type AnalyticsEventName =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'purchase_completed'
  | 'search'
  | 'share'
  | 'enquiry_sent'

export interface AnalyticsEventProperties {
  // Page view
  page_path?: string
  page_title?: string

  // Product events
  product_id?: string
  product_name?: string
  product_price?: number
  product_category?: string

  // Cart events
  quantity?: number
  cart_total?: number
  item_count?: number

  // Checkout/Purchase
  order_id?: string
  payment_method?: string
  shipping_method?: string
  currency?: string
  value?: number

  // Search
  search_term?: string

  // Tenant context
  tenant_id?: string
  tenant_slug?: string

  // Additional custom properties
  [key: string]: string | number | boolean | undefined
}

export interface AnalyticsProvider {
  trackEvent(
    eventName: AnalyticsEventName,
    properties?: AnalyticsEventProperties,
  ): void
  identify(userId: string, traits?: Record<string, unknown>): void
  reset(): void
}

class Analytics {
  private providers: AnalyticsProvider[] = []
  private enabled = true

  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  trackEvent(
    eventName: AnalyticsEventName,
    properties?: AnalyticsEventProperties,
  ): void {
    if (!this.enabled) return

    // Add timestamp to all events
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
    }

    // Send to all registered providers
    this.providers.forEach((provider) => {
      try {
        provider.trackEvent(eventName, enrichedProperties)
      } catch (error) {
        console.error(`Analytics provider error:`, error)
      }
    })

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}`, enrichedProperties)
    }
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.enabled) return

    this.providers.forEach((provider) => {
      try {
        provider.identify(userId, traits)
      } catch (error) {
        console.error(`Analytics identify error:`, error)
      }
    })
  }

  reset(): void {
    this.providers.forEach((provider) => {
      try {
        provider.reset()
      } catch (error) {
        console.error(`Analytics reset error:`, error)
      }
    })
  }
}

// Singleton instance
export const analytics = new Analytics()

// Default console provider for development
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  trackEvent(
    eventName: AnalyticsEventName,
    properties?: AnalyticsEventProperties,
  ): void {
    console.log(`[Analytics Event] ${eventName}`, properties)
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    console.log(`[Analytics Identify] ${userId}`, traits)
  }

  reset(): void {
    console.log(`[Analytics Reset]`)
  }
}

// Helper function for tracking page views
export function trackPageView(
  path: string,
  title?: string,
  additionalProps?: AnalyticsEventProperties,
): void {
  analytics.trackEvent('page_view', {
    page_path: path,
    page_title:
      title || (typeof document !== 'undefined' ? document.title : ''),
    ...additionalProps,
  })
}

// Helper function for tracking product views
export function trackProductView(
  productId: string,
  productName: string,
  price: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  analytics.trackEvent('product_view', {
    product_id: productId,
    product_name: productName,
    product_price: price,
    ...additionalProps,
  })
}

// Helper function for tracking cart operations
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  analytics.trackEvent('add_to_cart', {
    product_id: productId,
    product_name: productName,
    product_price: price,
    quantity,
    value: price * quantity,
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
  analytics.trackEvent('remove_from_cart', {
    product_id: productId,
    product_name: productName,
    product_price: price,
    quantity,
    value: price * quantity,
    ...additionalProps,
  })
}

// Helper function for tracking checkout
export function trackCheckoutStarted(
  cartTotal: number,
  itemCount: number,
  additionalProps?: AnalyticsEventProperties,
): void {
  analytics.trackEvent('checkout_started', {
    cart_total: cartTotal,
    item_count: itemCount,
    value: cartTotal,
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
  analytics.trackEvent('purchase_completed', {
    order_id: orderId,
    value: total,
    item_count: itemCount,
    payment_method: paymentMethod,
    currency: 'AUD',
    ...additionalProps,
  })
}
