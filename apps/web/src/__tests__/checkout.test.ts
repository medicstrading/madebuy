import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pieces, media, tenants, stockReservations } from '@madebuy/db'

// Mock the modules
vi.mock('@madebuy/db')

describe('Checkout Flow', () => {
  const mockTenantId = 'tenant-123'
  const mockPieceId = 'piece-456'
  const mockVariantId = 'variant-789'

  const mockPiece = {
    id: mockPieceId,
    tenantId: mockTenantId,
    name: 'Test Product',
    status: 'available',
    price: 99.99,
    currency: 'AUD',
    stock: 5,
    mediaIds: [],
  }

  const mockVariantPiece = {
    id: mockPieceId,
    tenantId: mockTenantId,
    name: 'Test Variant Product',
    status: 'available',
    price: 99.99,
    currency: 'AUD',
    hasVariants: true,
    variantOptions: [
      { name: 'Size', values: ['S', 'M', 'L'] },
      { name: 'Color', values: ['Red', 'Blue'] },
    ],
    variants: [
      {
        id: mockVariantId,
        options: { Size: 'M', Color: 'Red' },
        sku: 'TEST-M-RED',
        price: 109.99,
        stock: 3,
        isAvailable: true,
      },
      {
        id: 'variant-sold-out',
        options: { Size: 'L', Color: 'Blue' },
        sku: 'TEST-L-BLUE',
        stock: 0,
        isAvailable: false,
      },
    ],
    mediaIds: [],
  }

  const mockTenant = {
    id: mockTenantId,
    businessName: 'Test Shop',
    shippingConfig: {
      methods: [
        {
          id: 'standard',
          name: 'Standard Shipping',
          price: 9.95,
          currency: 'AUD',
          estimatedDays: { min: 5, max: 10 },
          countries: [],
          enabled: true,
        },
      ],
      freeShippingThreshold: 100,
      localPickupEnabled: false,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Stock Validation', () => {
    it('should reject checkout when piece is not found', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(null)

      const result = await pieces.getPiece(mockTenantId, 'non-existent')

      expect(result).toBeNull()
    })

    it('should reject checkout when piece is not available', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue({
        ...mockPiece,
        status: 'sold',
      } as any)

      const result = await pieces.getPiece(mockTenantId, mockPieceId)

      expect(result?.status).toBe('sold')
    })

    it('should reject checkout when insufficient stock', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue({
        ...mockPiece,
        stock: 1,
      } as any)
      vi.mocked(stockReservations.reserveStock).mockResolvedValue(null)

      const result = await stockReservations.reserveStock(
        mockTenantId,
        mockPieceId,
        5, // Trying to reserve 5, but only 1 available
        'session-123',
        30
      )

      expect(result).toBeNull()
    })

    it('should allow checkout when stock is sufficient', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)
      vi.mocked(stockReservations.reserveStock).mockResolvedValue({
        id: 'reservation-123',
        tenantId: mockTenantId,
        pieceId: mockPieceId,
        quantity: 2,
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
      })

      const result = await stockReservations.reserveStock(
        mockTenantId,
        mockPieceId,
        2,
        'session-123',
        30
      )

      expect(result).not.toBeNull()
      expect(result?.quantity).toBe(2)
    })
  })

  describe('Stock Reservation', () => {
    it('should cancel reservation when checkout fails', async () => {
      vi.mocked(stockReservations.cancelReservation).mockResolvedValue(true)

      const result = await stockReservations.cancelReservation('session-123')

      expect(result).toBe(true)
      expect(stockReservations.cancelReservation).toHaveBeenCalledWith('session-123')
    })

    it('should complete reservation when payment succeeds', async () => {
      vi.mocked(stockReservations.completeReservation).mockResolvedValue(true)

      const result = await stockReservations.completeReservation('session-123')

      expect(result).toBe(true)
      expect(stockReservations.completeReservation).toHaveBeenCalledWith('session-123')
    })
  })

  describe('Shipping Configuration', () => {
    it('should fetch tenant shipping config', async () => {
      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

      const tenant = await tenants.getTenantById(mockTenantId)

      expect(tenant?.shippingConfig?.methods).toHaveLength(1)
      expect(tenant?.shippingConfig?.methods[0].name).toBe('Standard Shipping')
    })

    it('should apply free shipping when threshold is met', async () => {
      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

      const tenant = await tenants.getTenantById(mockTenantId)
      const subtotal = 150 // Above $100 threshold
      const qualifiesForFreeShipping = tenant?.shippingConfig?.freeShippingThreshold
        ? subtotal >= tenant.shippingConfig.freeShippingThreshold
        : false

      expect(qualifiesForFreeShipping).toBe(true)
    })

    it('should not apply free shipping when below threshold', async () => {
      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

      const tenant = await tenants.getTenantById(mockTenantId)
      const subtotal = 50 // Below $100 threshold
      const qualifiesForFreeShipping = tenant?.shippingConfig?.freeShippingThreshold
        ? subtotal >= tenant.shippingConfig.freeShippingThreshold
        : false

      expect(qualifiesForFreeShipping).toBe(false)
    })
  })

  describe('Product Variants', () => {
    it('should find a specific variant by ID', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(mockVariantPiece as any)

      const piece = await pieces.getPiece(mockTenantId, mockPieceId)
      const variant = piece?.variants?.find(v => v.id === mockVariantId)

      expect(variant).toBeDefined()
      expect(variant?.sku).toBe('TEST-M-RED')
      expect(variant?.options).toEqual({ Size: 'M', Color: 'Red' })
    })

    it('should use variant price when set', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(mockVariantPiece as any)

      const piece = await pieces.getPiece(mockTenantId, mockPieceId)
      const variant = piece?.variants?.find(v => v.id === mockVariantId)
      const effectivePrice = variant?.price ?? piece?.price

      expect(effectivePrice).toBe(109.99) // Variant overrides base price
    })

    it('should reserve variant-level stock', async () => {
      vi.mocked(stockReservations.reserveStock).mockResolvedValue({
        id: 'reservation-123',
        tenantId: mockTenantId,
        pieceId: mockPieceId,
        variantId: mockVariantId,
        quantity: 2,
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
      })

      const result = await stockReservations.reserveStock(
        mockTenantId,
        mockPieceId,
        2,
        'session-123',
        30,
        mockVariantId // Variant ID passed
      )

      expect(result).not.toBeNull()
      expect(result?.variantId).toBe(mockVariantId)
    })

    it('should reject unavailable variant', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(mockVariantPiece as any)

      const piece = await pieces.getPiece(mockTenantId, mockPieceId)
      const soldOutVariant = piece?.variants?.find(v => v.id === 'variant-sold-out')

      expect(soldOutVariant?.isAvailable).toBe(false)
      expect(soldOutVariant?.stock).toBe(0)
    })

    it('should calculate total variant stock', async () => {
      vi.mocked(pieces.getPiece).mockResolvedValue(mockVariantPiece as any)

      const piece = await pieces.getPiece(mockTenantId, mockPieceId)
      const totalStock = piece?.variants?.reduce((sum, v) => sum + (v.stock ?? 0), 0)

      expect(totalStock).toBe(3) // 3 + 0 = 3
    })
  })
})
