import { pieces, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-session-id'),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'cart_session') return { value: 'existing-session-id' }
      return undefined
    }),
    set: vi.fn(),
  })),
}))

// Import handlers after mocks
import { POST as validateCart } from '../carts/validate/route'
import { POST as trackCart } from '../carts/track/route'
import { POST as recoverCart } from '../carts/recover/route'

describe('Cart API - Validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate cart items successfully', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockPiece = {
      id: 'piece-1',
      stock: 10,
      variants: null,
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)

    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { pieceId: 'piece-1', quantity: 2 },
        ],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].valid).toBe(true)
    expect(data.items[0].available).toBe(10)
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ pieceId: 'piece-1', quantity: 1 }],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })

  it('should return 400 if items is not an array', async () => {
    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: 'not-an-array',
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('items must be an array')
  })

  it('should mark invalid items when piece not found', async () => {
    const mockTenant = { id: 'tenant-1' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [{ pieceId: 'invalid-piece', quantity: 1 }],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.items[0].valid).toBe(false)
    expect(data.items[0].available).toBe(0)
  })

  it('should validate variant stock', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockPiece = {
      id: 'piece-1',
      stock: null,
      variants: [
        { id: 'var-1', stock: 5 },
        { id: 'var-2', stock: 10 },
      ],
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)

    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { pieceId: 'piece-1', variantId: 'var-1', quantity: 3 },
        ],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.items[0].available).toBe(5)
  })

  it('should handle unlimited stock (null)', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockPiece = {
      id: 'piece-1',
      stock: null, // unlimited
      variants: null,
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)

    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [{ pieceId: 'piece-1', quantity: 1000 }],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.items[0].available).toBe(-1) // -1 indicates unlimited
  })

  it('should invalidate items exceeding stock', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockPiece = {
      id: 'piece-1',
      stock: 3,
      variants: null,
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)

    const request = new NextRequest('http://localhost/api/carts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [{ pieceId: 'piece-1', quantity: 5 }],
      }),
    })

    const response = await validateCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.items[0].valid).toBe(false)
    expect(data.items[0].requested).toBe(5)
    expect(data.items[0].available).toBe(3)
  })
})

describe('Cart API - Track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should track cart successfully', async () => {
    const abandonedCarts = await import('@madebuy/db').then(m => m.abandonedCarts)
    vi.spyOn(abandonedCarts, 'upsertAbandonedCart').mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/carts/track', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { id: 'piece-1', name: 'Test Item', price: 50, quantity: 1 },
        ],
        total: 50,
        currency: 'AUD',
      }),
    })

    const response = await trackCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(true)
    expect(data.sessionId).toBeDefined()
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/carts/track', {
      method: 'POST',
      body: JSON.stringify({
        items: [],
      }),
    })

    const response = await trackCart(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })

  it('should not track empty carts', async () => {
    const request = new NextRequest('http://localhost/api/carts/track', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [],
      }),
    })

    const response = await trackCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.tracked).toBe(false)
  })

  it('should update email for existing cart', async () => {
    const abandonedCarts = await import('@madebuy/db').then(m => m.abandonedCarts)
    const existingCart = {
      sessionId: 'existing-session-id',
      items: [{ productId: 'piece-1', name: 'Test', price: 50, quantity: 1 }],
      total: 50,
      currency: 'AUD',
    }

    vi.spyOn(abandonedCarts, 'getAbandonedCartBySession').mockResolvedValue(existingCart as any)
    vi.spyOn(abandonedCarts, 'upsertAbandonedCart').mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/carts/track', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [],
        customerEmail: 'test@example.com',
      }),
    })

    const response = await trackCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.emailUpdated).toBe(true)
  })
})

describe('Cart API - Recover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should recover abandoned cart successfully', async () => {
    const mockCart = {
      id: 'cart-1',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      items: [{ productId: 'piece-1', name: 'Test Item', price: 50, quantity: 1 }],
      recovered: false,
      abandonedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    }

    const mockTenant = { id: 'tenant-1' }

    const { getDatabase } = await import('@madebuy/db')
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(mockCart),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn(() => mockCollection),
    } as any)

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

    const discounts = await import('@madebuy/db').then(m => m.discounts)
    const abandonedCarts = await import('@madebuy/db').then(m => m.abandonedCarts)
    vi.spyOn(discounts, 'createDiscountCode').mockResolvedValue({ code: 'COMEBACK123' } as any)
    vi.spyOn(abandonedCarts, 'markCartRecovered').mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/carts/recover', {
      method: 'POST',
      body: JSON.stringify({
        cartId: 'cart-1',
        tenantId: 'tenant-1',
      }),
    })

    const response = await recoverCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.items).toEqual(mockCart.items)
    expect(data.discountCode).toBeDefined()
    expect(data.discountPercentage).toBe(10)
  })

  it('should return 400 if parameters are missing', async () => {
    const request = new NextRequest('http://localhost/api/carts/recover', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await recoverCart(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Missing required parameters')
  })

  it('should return 404 if cart not found', async () => {
    const { getDatabase } = await import('@madebuy/db')
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn(() => mockCollection),
    } as any)

    const request = new NextRequest('http://localhost/api/carts/recover', {
      method: 'POST',
      body: JSON.stringify({
        cartId: 'invalid-cart',
        tenantId: 'tenant-1',
      }),
    })

    const response = await recoverCart(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Cart not found')
  })

  it('should return 400 if cart already recovered', async () => {
    const mockCart = {
      id: 'cart-1',
      tenantId: 'tenant-1',
      recovered: true, // Already recovered
    }

    const { getDatabase } = await import('@madebuy/db')
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(mockCart),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn(() => mockCollection),
    } as any)

    const request = new NextRequest('http://localhost/api/carts/recover', {
      method: 'POST',
      body: JSON.stringify({
        cartId: 'cart-1',
        tenantId: 'tenant-1',
      }),
    })

    const response = await recoverCart(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('already been recovered')
  })

  it('should not create discount for recently abandoned cart', async () => {
    const mockCart = {
      id: 'cart-1',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      items: [{ productId: 'piece-1', name: 'Test Item', price: 50, quantity: 1 }],
      recovered: false,
      abandonedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago (< 24 hours)
    }

    const mockTenant = { id: 'tenant-1' }

    const { getDatabase } = await import('@madebuy/db')
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(mockCart),
    }
    vi.mocked(getDatabase).mockResolvedValue({
      collection: vi.fn(() => mockCollection),
    } as any)

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

    const abandonedCarts = await import('@madebuy/db').then(m => m.abandonedCarts)
    vi.spyOn(abandonedCarts, 'markCartRecovered').mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/carts/recover', {
      method: 'POST',
      body: JSON.stringify({
        cartId: 'cart-1',
        tenantId: 'tenant-1',
      }),
    })

    const response = await recoverCart(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.discountCode).toBeUndefined()
  })
})
