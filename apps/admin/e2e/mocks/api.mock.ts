import type {
  Customer,
  Material,
  MediaItem,
  Order,
  OrderStatus,
  PaymentStatus,
  Piece,
  PieceStatus,
  Tenant,
} from '@madebuy/shared'
import type { Page, Route } from '@playwright/test'

/**
 * API Mocking Utilities for MadeBuy Admin E2E Tests
 *
 * Provides helpers to mock API routes using Playwright's route.fulfill()
 * allowing tests to run without hitting real API endpoints.
 */

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Generate mock tenant data
 */
export function createMockTenant(overrides: Partial<Tenant> = {}): Tenant {
  const id = overrides.id || `tenant-${Date.now()}`
  return {
    id,
    slug: overrides.slug || 'test-shop',
    email: overrides.email || 'test@example.com',
    passwordHash: 'mock-hash',
    businessName: overrides.businessName || 'Test Shop',
    tagline: 'Handmade with love',
    description: 'Test description',
    location: 'Sydney, Australia',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    domainStatus: 'none',
    plan: 'maker',
    features: {
      unlimitedPieces: true,
      socialPublishing: true,
      aiCaptions: false,
      customDomain: false,
      analytics: true,
      bulkOperations: true,
      multiCurrency: false,
      advancedSEO: false,
      prioritySupport: false,
      whiteLabel: false,
    },
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Tenant
}

/**
 * Generate mock piece data
 */
export function createMockPiece(overrides: Partial<Piece> = {}): Piece {
  const id = overrides.id || `piece-${Date.now()}`
  const name = overrides.name || `Test Piece ${Date.now()}`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    name,
    slug: overrides.slug || name.toLowerCase().replace(/\s+/g, '-'),
    description: overrides.description || 'Test description',
    materials: overrides.materials || ['Silver', 'Gold'],
    techniques: overrides.techniques || ['Handmade'],
    price: overrides.price ?? 9999, // $99.99 in cents
    currency: overrides.currency || 'AUD',
    status: (overrides.status as PieceStatus) || 'available',
    stock: overrides.stock ?? 1,
    mediaIds: overrides.mediaIds || [],
    isFeatured: overrides.isFeatured ?? false,
    category: overrides.category || 'General',
    tags: overrides.tags || [],
    isPublishedToWebsite: overrides.isPublishedToWebsite ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Piece
}

/**
 * Generate mock material data
 */
export function createMockMaterial(
  overrides: Partial<Material> = {},
): Material {
  const id = overrides.id || `material-${Date.now()}`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    name: overrides.name || `Test Material ${Date.now()}`,
    category: overrides.category || 'other',
    unit: overrides.unit || 'piece',
    quantityInStock: overrides.quantityInStock ?? 100,
    costPerUnit: overrides.costPerUnit ?? 500, // $5.00 in cents
    currency: overrides.currency || 'AUD',
    reorderPoint: overrides.reorderPoint ?? 10,
    isLowStock: overrides.isLowStock ?? false,
    tags: overrides.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Material
}

/**
 * Generate mock order data
 */
export function createMockOrder(overrides: Partial<Order> = {}): Order {
  const id = overrides.id || `order-${Date.now()}`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    orderNumber:
      overrides.orderNumber || `MB-2025-${Math.floor(Math.random() * 10000)}`,
    customerEmail: overrides.customerEmail || 'customer@example.com',
    customerName: overrides.customerName || 'Test Customer',
    items: overrides.items || [
      {
        pieceId: 'piece-1',
        name: 'Test Piece',
        price: 9999,
        quantity: 1,
      },
    ],
    subtotal: overrides.subtotal ?? 9999,
    shipping: overrides.shipping ?? 1000,
    tax: overrides.tax ?? 1100,
    discount: overrides.discount ?? 0,
    total: overrides.total ?? 12099,
    currency: overrides.currency || 'AUD',
    shippingAddress: overrides.shippingAddress || {
      line1: '123 Test St',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      country: 'AU',
    },
    shippingMethod: overrides.shippingMethod || 'Standard',
    shippingType: overrides.shippingType || 'standard',
    paymentMethod: overrides.paymentMethod || 'card',
    paymentStatus: (overrides.paymentStatus as PaymentStatus) || 'paid',
    status: (overrides.status as OrderStatus) || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Order
}

/**
 * Generate mock customer data
 */
export function createMockCustomer(
  overrides: Partial<Customer> = {},
): Customer {
  const id = overrides.id || `customer-${Date.now()}`
  const email = overrides.email || `customer-${Date.now()}@example.com`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    email,
    name: overrides.name || 'Test Customer',
    phone: overrides.phone || '0412345678',
    addresses: overrides.addresses || [
      {
        id: 'addr-1',
        line1: '123 Test St',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'AU',
        isDefault: true,
      },
    ],
    totalOrders: overrides.totalOrders ?? 0,
    totalSpent: overrides.totalSpent ?? 0,
    averageOrderValue: overrides.averageOrderValue ?? 0,
    tags: overrides.tags || [],
    emailSubscribed: overrides.emailSubscribed ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Customer
}

/**
 * Generate mock media item data
 */
export function createMockMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  const id = overrides.id || `media-${Date.now()}`
  const r2Key = `tenant-1/${id}.jpg`
  const url = `https://cdn.example.com/${id}.jpg`
  return {
    id,
    tenantId: overrides.tenantId || 'tenant-1',
    originalFilename: overrides.originalFilename || 'test-image.jpg',
    mimeType: overrides.mimeType || 'image/jpeg',
    sizeBytes: overrides.sizeBytes ?? 102400, // 100KB
    type: overrides.type || 'image',
    variants: overrides.variants || {
      original: { r2Key, url, width: 1920, height: 1080 },
      large: {
        r2Key: `${r2Key}-large`,
        url: `${url}-large`,
        width: 1200,
        height: 675,
      },
      thumb: {
        r2Key: `${r2Key}-thumb`,
        url: `${url}-thumb`,
        width: 300,
        height: 169,
      },
    },
    platformOptimized: overrides.platformOptimized || [],
    tags: overrides.tags || [],
    isFavorite: overrides.isFavorite ?? false,
    publishedTo: overrides.publishedTo || [],
    source: overrides.source || 'upload',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MediaItem
}

// =============================================================================
// API Route Mocking Functions
// =============================================================================

/**
 * Mock authenticated session
 * Simulates NextAuth session by mocking the /api/auth/session endpoint
 */
export async function mockAuthenticatedSession(
  page: Page,
  tenant: Partial<Tenant> = {},
): Promise<void> {
  const mockTenant = createMockTenant(tenant)

  await page.route('**/api/auth/session', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: mockTenant.id,
          email: mockTenant.email,
          businessName: mockTenant.businessName,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  })

  // Also mock tenant info endpoint
  await page.route('**/api/tenant', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTenant),
    })
  })
}

/**
 * Mock pieces API - list endpoint
 */
export async function mockPiecesListApi(
  page: Page,
  pieces: Piece[] = [],
): Promise<void> {
  await page.route('**/api/pieces', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pieces }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock piece detail API - single piece endpoint
 */
export async function mockPieceDetailApi(
  page: Page,
  pieceId: string,
  piece: Piece,
): Promise<void> {
  await page.route(`**/api/pieces/${pieceId}`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ piece }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock piece creation
 */
export async function mockPieceCreateApi(
  page: Page,
  createdPiece: Piece,
): Promise<void> {
  await page.route('**/api/pieces', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ piece: createdPiece }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock piece update
 */
export async function mockPieceUpdateApi(
  page: Page,
  pieceId: string,
  updatedPiece: Piece,
): Promise<void> {
  await page.route(`**/api/pieces/${pieceId}`, async (route: Route) => {
    if (
      route.request().method() === 'PUT' ||
      route.request().method() === 'PATCH'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ piece: updatedPiece }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock piece deletion
 */
export async function mockPieceDeleteApi(
  page: Page,
  pieceId: string,
): Promise<void> {
  await page.route(`**/api/pieces/${pieceId}`, async (route: Route) => {
    if (route.request().method() === 'DELETE') {
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
 * Mock materials API
 */
export async function mockMaterialsApi(
  page: Page,
  materials: Material[] = [],
): Promise<void> {
  await page.route('**/api/materials', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ materials }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock orders API
 */
export async function mockOrdersApi(
  page: Page,
  orders: Order[] = [],
): Promise<void> {
  await page.route('**/api/orders', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orders }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock order detail API
 */
export async function mockOrderDetailApi(
  page: Page,
  orderId: string,
  order: Order,
): Promise<void> {
  await page.route(`**/api/orders/${orderId}`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ order }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock customers API
 */
export async function mockCustomersApi(
  page: Page,
  customers: Customer[] = [],
): Promise<void> {
  await page.route('**/api/customers', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock media upload API
 */
export async function mockMediaUploadApi(
  page: Page,
  uploadedMedia: MediaItem,
): Promise<void> {
  await page.route('**/api/media/upload', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ media: uploadedMedia }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock bulk operations API
 */
export async function mockBulkOperationsApi(
  page: Page,
  result: { success: number; failed: number; errors?: string[] },
): Promise<void> {
  await page.route('**/api/pieces/bulk', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(result),
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
  errorMessage: string = 'Internal Server Error',
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
// Helper: Complete API Setup
// =============================================================================

/**
 * Setup complete mocked API environment for tests
 * Mocks all common endpoints with default data
 */
export async function setupMockedApi(
  page: Page,
  options: {
    tenant?: Partial<Tenant>
    pieces?: Piece[]
    materials?: Material[]
    orders?: Order[]
    customers?: Customer[]
  } = {},
): Promise<void> {
  // Mock authentication
  await mockAuthenticatedSession(page, options.tenant)

  // Mock data endpoints
  await mockPiecesListApi(page, options.pieces || [])
  await mockMaterialsApi(page, options.materials || [])
  await mockOrdersApi(page, options.orders || [])
  await mockCustomersApi(page, options.customers || [])
}

/**
 * Clear all route mocks
 */
export async function clearApiMocks(page: Page): Promise<void> {
  await page.unroute('**/*')
}
