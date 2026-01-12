import type { Page, Route } from '@playwright/test'
import type {
  Tenant,
  Piece,
  Order,
  MediaItem,
  PieceStatus,
  Customer,
  DiscountCode,
} from '@madebuy/shared'

/**
 * API Mocking Utilities for MadeBuy Web (Storefront) E2E Tests
 *
 * Provides helpers to mock storefront API routes using Playwright's route.fulfill()
 * allowing tests to run without hitting real API endpoints.
 */

// =============================================================================
// Mock Data Factories for Storefront
// =============================================================================

/**
 * Generate mock tenant for storefront
 */
export function createMockTenant(overrides: Partial<Tenant> = {}): Tenant {
  const slug = overrides.slug || 'demo-shop'
  return {
    id: overrides.id || 'tenant-1',
    slug,
    email: 'shop@example.com',
    passwordHash: 'mock-hash',
    businessName: overrides.businessName || 'Demo Shop',
    tagline: overrides.tagline || 'Handmade with love',
    description: overrides.description || 'Welcome to our handmade shop!',
    location: overrides.location || 'Sydney, Australia',
    primaryColor: overrides.primaryColor || '#3b82f6',
    accentColor: overrides.accentColor || '#10b981',
    domainStatus: 'none',
    plan: 'maker',
    features: {
      unlimitedPieces: true,
      socialPublishing: true,
      aiCaptions: false,
      customDomain: false,
      analytics: true,
      bulkOperations: false,
      multiCurrency: false,
      advancedSEO: false,
      prioritySupport: false,
      whiteLabel: false,
    },
    websiteDesign: {
      template: overrides.websiteDesign?.template || 'classic',
      heroImageMediaId: undefined,
      showFeaturedProducts: true,
      showBlog: false,
      pages: [],
    },
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Tenant
}

/**
 * Generate mock product/piece for storefront
 */
export function createMockProduct(overrides: Partial<Piece> = {}): Piece {
  const id = overrides.id || `piece-${Date.now()}`
  const name = overrides.name || `Handmade Product ${Date.now()}`
  const slug = overrides.slug || name.toLowerCase().replace(/\s+/g, '-')

  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    name,
    slug,
    description: overrides.description || 'Beautiful handmade product crafted with care.',
    materials: overrides.materials || ['Sterling Silver', 'Gemstone'],
    techniques: overrides.techniques || ['Handmade', 'Polished'],
    price: overrides.price ?? 4999, // $49.99 in cents
    currency: overrides.currency || 'AUD',
    status: (overrides.status as PieceStatus) || 'available',
    stock: overrides.stock ?? 5,
    mediaIds: overrides.mediaIds || ['media-1'],
    primaryMediaId: overrides.primaryMediaId || 'media-1',
    isFeatured: overrides.isFeatured ?? false,
    category: overrides.category || 'Jewelry',
    tags: overrides.tags || ['handmade', 'unique'],
    isPublishedToWebsite: true,
    websiteSlug: slug,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Piece
}

/**
 * Generate mock media for products
 */
export function createMockMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  const id = overrides.id || `media-${Date.now()}`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    filename: overrides.filename || 'product-image.jpg',
    mimeType: overrides.mimeType || 'image/jpeg',
    size: overrides.size ?? 204800, // 200KB
    type: overrides.type || 'image',
    r2Key: overrides.r2Key || `tenant-1/${id}.jpg`,
    url: overrides.url || `https://cdn.example.com/products/${id}.jpg`,
    variants: {
      thumbnail: `https://cdn.example.com/products/${id}-thumb.jpg`,
      medium: `https://cdn.example.com/products/${id}-medium.jpg`,
      large: `https://cdn.example.com/products/${id}-large.jpg`,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MediaItem
}

/**
 * Generate mock cart data
 */
export interface MockCartItem {
  productSlug: string
  quantity: number
  options?: Record<string, string>
  personalization?: Record<string, string>
}

export interface MockCart {
  items: MockCartItem[]
  subtotal: number
  shipping?: number
  tax?: number
  discount?: number
  total: number
}

export function createMockCart(items: MockCartItem[] = []): MockCart {
  const subtotal = items.reduce((sum, item) => sum + 4999 * item.quantity, 0)
  const shipping = 1000 // $10 shipping
  const tax = Math.round((subtotal + shipping) * 0.1) // 10% tax
  const total = subtotal + shipping + tax

  return {
    items,
    subtotal,
    shipping,
    tax,
    discount: 0,
    total,
  }
}

/**
 * Generate mock discount code
 */
export function createMockDiscount(overrides: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: overrides.id || 'discount-1',
    tenantId: overrides.tenantId || 'tenant-1',
    code: overrides.code || 'SAVE10',
    type: overrides.type || 'percentage',
    value: overrides.value ?? 10, // 10% or $10
    minOrderAmount: overrides.minOrderAmount,
    maxDiscountAmount: overrides.maxDiscountAmount,
    usageLimit: overrides.usageLimit,
    usageCount: overrides.usageCount ?? 0,
    expiresAt: overrides.expiresAt,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DiscountCode
}

/**
 * Generate mock customer for checkout
 */
export function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: overrides.id || 'customer-1',
    tenantId: overrides.tenantId || 'tenant-1',
    email: overrides.email || 'customer@example.com',
    firstName: overrides.firstName || 'John',
    lastName: overrides.lastName || 'Doe',
    phone: overrides.phone || '0412345678',
    addresses: overrides.addresses || [
      {
        line1: '123 Main Street',
        line2: 'Apt 4',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'AU',
        isDefault: true,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Customer
}

// =============================================================================
// Storefront API Mocking Functions
// =============================================================================

/**
 * Mock tenant/storefront data
 */
export async function mockStorefrontApi(
  page: Page,
  tenantSlug: string,
  tenant: Tenant
): Promise<void> {
  // Mock tenant info endpoint
  await page.route(`**/api/storefront/${tenantSlug}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tenant }),
    })
  })

  // Also mock the direct tenant endpoint
  await page.route(`**/api/tenants/${tenantSlug}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tenant }),
    })
  })
}

/**
 * Mock products list for storefront
 */
export async function mockProductsApi(
  page: Page,
  tenantSlug: string,
  products: Piece[]
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/products`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock single product detail
 */
export async function mockProductDetailApi(
  page: Page,
  tenantSlug: string,
  productSlug: string,
  product: Piece,
  media: MediaItem[] = []
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/products/${productSlug}`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ product, media }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock featured products
 */
export async function mockFeaturedProductsApi(
  page: Page,
  tenantSlug: string,
  products: Piece[]
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/products/featured`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ products }),
    })
  })
}

/**
 * Mock cart validation API
 */
export async function mockCartValidationApi(
  page: Page,
  tenantSlug: string,
  validatedCart: MockCart
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/cart/validate`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(validatedCart),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock discount code validation
 */
export async function mockDiscountValidationApi(
  page: Page,
  tenantSlug: string,
  code: string,
  discount: DiscountCode | null
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/discounts/validate`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      if (discount) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ discount }),
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid discount code' }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock Stripe checkout session creation
 */
export async function mockStripeCheckoutApi(
  page: Page,
  tenantSlug: string,
  sessionId: string = 'cs_test_mock123',
  sessionUrl: string = 'https://checkout.stripe.com/pay/cs_test_mock123'
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/checkout`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId,
          url: sessionUrl,
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock order creation (for non-Stripe flows)
 */
export async function mockOrderCreateApi(
  page: Page,
  tenantSlug: string,
  order: Order
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/orders`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ order }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock order status check
 */
export async function mockOrderStatusApi(
  page: Page,
  tenantSlug: string,
  orderId: string,
  order: Order
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/orders/${orderId}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ order }),
    })
  })
}

/**
 * Mock contact/enquiry submission
 */
export async function mockEnquiryApi(
  page: Page,
  tenantSlug: string,
  success: boolean = true
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/enquiries`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      if (success) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Message sent successfully' }),
        })
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send message' }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock newsletter subscription
 */
export async function mockNewsletterApi(
  page: Page,
  tenantSlug: string,
  success: boolean = true
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/newsletter`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      if (success) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email already subscribed' }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock shipping rates calculation
 */
export async function mockShippingRatesApi(
  page: Page,
  tenantSlug: string,
  rates: Array<{ id: string; name: string; price: number; estimatedDays: { min: number; max: number } }>
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/shipping/rates`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rates }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock analytics tracking (pageview, add-to-cart, etc.)
 */
export async function mockAnalyticsApi(
  page: Page,
  tenantSlug: string
): Promise<void> {
  await page.route(`**/api/storefront/${tenantSlug}/analytics/track`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock error response for testing error handling
 */
export async function mockApiError(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 500,
  errorMessage: string = 'Internal Server Error'
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    })
  })
}

// =============================================================================
// Helper: Complete Storefront API Setup
// =============================================================================

/**
 * Setup complete mocked storefront API environment
 * Mocks all common endpoints with default data
 */
export async function setupMockedStorefront(
  page: Page,
  tenantSlug: string,
  options: {
    tenant?: Partial<Tenant>
    products?: Piece[]
    featuredProducts?: Piece[]
    media?: MediaItem[]
  } = {}
): Promise<void> {
  const tenant = createMockTenant({ slug: tenantSlug, ...options.tenant })
  const products = options.products || []
  const featuredProducts = options.featuredProducts || products.filter(p => p.isFeatured)

  // Mock storefront endpoints
  await mockStorefrontApi(page, tenantSlug, tenant)
  await mockProductsApi(page, tenantSlug, products)
  await mockFeaturedProductsApi(page, tenantSlug, featuredProducts)

  // Mock analytics (silent tracking)
  await mockAnalyticsApi(page, tenantSlug)

  // Mock cart validation with default calculator
  await page.route(`**/api/storefront/${tenantSlug}/cart/validate`, async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const cart = createMockCart(body.items || [])
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cart),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Clear all route mocks
 */
export async function clearApiMocks(page: Page): Promise<void> {
  await page.unroute('**/*')
}
