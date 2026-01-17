/**
 * Tests for pieces API routes
 * Covers CRUD operations, auth, and validation
 */

import { pieces } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock getCurrentTenant
const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
  requireTenant: async () => {
    const tenant = mockGetCurrentTenant()
    if (!tenant) throw new Error('Unauthorized')
    return tenant
  },
}))

// Mock subscription check
vi.mock('@/lib/subscription-check', () => ({
  checkCanAddPiece: vi.fn().mockResolvedValue({ allowed: true }),
  getSubscriptionSummary: vi.fn().mockResolvedValue({
    plan: 'free',
    pieces: { current: 5, limit: 10, canAdd: true },
  }),
}))

// Import handlers after mocks
import { GET, POST } from '../pieces/route'

describe('Pieces API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    plan: 'free',
  }

  const mockPiece = {
    id: 'piece-456',
    tenantId: 'tenant-123',
    name: 'Silver Ring',
    slug: 'silver-ring',
    description: 'A beautiful silver ring',
    price: 99.99,
    status: 'available' as const,
    mediaIds: [],
    materials: [],
    techniques: [],
    currency: 'AUD',
    isFeatured: false,
    category: 'Rings',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentTenant.mockReset()
  })

  describe('GET /api/pieces', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return pieces when authenticated', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(pieces.listPieces).mockResolvedValue([mockPiece])

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pieces).toHaveLength(1)
      expect(data.pieces[0].name).toBe('Silver Ring')
      expect(data.subscription).toBeDefined()
    })

    it('should call listPieces with correct tenant ID', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(pieces.listPieces).mockResolvedValue([])

      await GET()

      expect(pieces.listPieces).toHaveBeenCalledWith('tenant-123')
    })
  })

  describe('POST /api/pieces', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/pieces', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Ring',
          price: 149.99,
          status: 'draft',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create piece when authenticated', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(pieces.createPiece).mockResolvedValue({
        ...mockPiece,
        id: 'new-piece-id',
        name: 'New Ring',
        price: 149.99,
      } as any)

      const request = new NextRequest('http://localhost/api/pieces', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Ring',
          price: 149.99,
          status: 'draft',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.piece.name).toBe('New Ring')
    })

    it('should return 403 when subscription limit reached', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      const { checkCanAddPiece } = await import('@/lib/subscription-check')
      vi.mocked(checkCanAddPiece).mockResolvedValueOnce({
        allowed: false,
        message: 'You have reached your piece limit',
        upgradeRequired: true,
        requiredPlan: 'maker',
      })

      const request = new NextRequest('http://localhost/api/pieces', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Ring',
          price: 149.99,
          status: 'draft',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.code).toBe('SUBSCRIPTION_LIMIT')
    })
  })
})
