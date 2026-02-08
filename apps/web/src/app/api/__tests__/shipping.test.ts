import { pieces, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock shipping client
vi.mock('@madebuy/shipping', () => ({
  createSendleClient: vi.fn(() => ({
    getQuotes: vi.fn().mockResolvedValue({
      quotes: [
        {
          plan_name: 'Standard',
          price_in_cents: 995,
          estimated_delivery_days: { min: 3, max: 7 },
          features: ['Tracking included'],
        },
        {
          plan_name: 'Express',
          price_in_cents: 1495,
          estimated_delivery_days: { min: 1, max: 3 },
          features: ['Tracking included', 'Priority handling'],
        },
      ],
    }),
  })),
}))

// Import handlers after mocks
import { GET as getShippingQuoteGET, POST as getShippingQuotePOST } from '../shipping/quote/route'

describe('Shipping Quote API - POST (New Format)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get shipping quotes for cart items', async () => {
    const mockTenant = {
      id: 'tenant-1',
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        environment: 'sandbox',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    const mockPiece = {
      id: 'piece-1',
      shippingWeight: 500,
      shippingLength: 20,
      shippingWidth: 15,
      shippingHeight: 10,
      price: 50,
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { pieceId: 'piece-1', quantity: 1, price: 5000 }, // Price in cents
        ],
        destination: {
          postcode: '2000',
          suburb: 'SYDNEY',
          state: 'NSW',
          country: 'AU',
        },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quotes).toBeDefined()
    expect(data.quotes.length).toBeGreaterThan(0)
    expect(data.quotes[0].carrier).toBe('Sendle')
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: '',  // Empty string, but key exists
        items: [],
        destination: { postcode: '2000', suburb: 'SYDNEY', state: 'NSW' },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('tenantId is required')
  })

  it('should return 400 if destination is missing', async () => {
    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [],
        destination: {},  // Empty object, all fields will be falsy
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Destination address')
  })

  it('should return 404 if tenant not found', async () => {
    vi.mocked(tenants.getTenantById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'invalid-tenant',
        items: [],
        destination: { postcode: '2000', suburb: 'SYDNEY', state: 'NSW' },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Tenant not found')
  })

  it('should return fallback quotes if Sendle not configured', async () => {
    const mockTenant = {
      id: 'tenant-1',
      sendleSettings: {
        isConnected: false,
      },
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue({ id: 'piece-1' } as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [{ pieceId: 'piece-1', quantity: 1 }],
        destination: { postcode: '2000', suburb: 'SYDNEY', state: 'NSW' },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quotes).toBeDefined()
    expect(data.message).toContain('not configured')
  })

  it('should apply free shipping if eligible', async () => {
    const mockTenant = {
      id: 'tenant-1',
      freeShippingThreshold: 5000, // $50 in cents
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue({ id: 'piece-1' } as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { pieceId: 'piece-1', quantity: 1, price: 6000 }, // Over threshold
        ],
        destination: { postcode: '2000', suburb: 'SYDNEY', state: 'NSW' },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.freeShippingEligible).toBe(true)
    expect(data.quotes.some((q: any) => q.price === 0)).toBe(true)
  })

  it('should calculate total weight from multiple items', async () => {
    const mockTenant = {
      id: 'tenant-1',
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    const mockPiece1 = { id: 'piece-1', shippingWeight: 200 }
    const mockPiece2 = { id: 'piece-2', shippingWeight: 300 }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece)
      .mockResolvedValueOnce(mockPiece1 as any)
      .mockResolvedValueOnce(mockPiece2 as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        items: [
          { pieceId: 'piece-1', quantity: 2 },
          { pieceId: 'piece-2', quantity: 1 },
        ],
        destination: { postcode: '2000', suburb: 'SYDNEY', state: 'NSW' },
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Total weight should be 200*2 + 300*1 = 700g
    expect(data.parcelDetails.weightGrams).toBe(700)
  })
})

describe('Shipping Quote API - POST (Legacy Format)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle legacy format with tenantSlug', async () => {
    const mockTenant = {
      id: 'tenant-1',
      slug: 'test-tenant',
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.getPiece).mockResolvedValue({
      id: 'piece-1',
      shippingWeight: 500,
    } as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantSlug: 'test-tenant',
        destinationPostcode: '2000',
        destinationSuburb: 'SYDNEY',
        destinationState: 'NSW',
        pieceId: 'piece-1',
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quotes).toBeDefined()
  })

  it('should use default dimensions if not provided', async () => {
    const mockTenant = {
      id: 'tenant-1',
      slug: 'test-tenant',
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(mockTenant as any)

    const request = new NextRequest('http://localhost/api/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({
        tenantSlug: 'test-tenant',
        destinationPostcode: '2000',
        destinationSuburb: 'SYDNEY',
        destinationState: 'NSW',
      }),
    })

    const response = await getShippingQuotePOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.parcelDetails.weightGrams).toBeGreaterThan(0)
  })
})

describe('Shipping Quote API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle GET requests with query params', async () => {
    const mockTenant = {
      id: 'tenant-1',
      slug: 'test-tenant',
      sendleSettings: {
        isConnected: true,
        apiKey: 'test-key',
        senderId: 'sender-123',
        pickupAddress: {
          postcode: '4000',
          suburb: 'BRISBANE',
          state: 'QLD',
        },
      },
    }

    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(mockTenant as any)

    const request = new NextRequest('http://localhost/api/shipping/quote?tenant=test-tenant&postcode=2000&suburb=SYDNEY&state=NSW')
    const response = await getShippingQuoteGET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quotes).toBeDefined()
  })

  it('should return 400 if required params are missing', async () => {
    const request = new NextRequest('http://localhost/api/shipping/quote?tenant=test-tenant')
    const response = await getShippingQuoteGET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required parameters')
  })
})
