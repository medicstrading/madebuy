/**
 * Tests for bulk operations API routes
 * Covers all 9 bulk operations, auth, and validation
 */

import { bulk } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock getCurrentTenant
const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Import handlers after mocks
import { GET, POST } from '../pieces/bulk/route'

describe('Bulk Operations API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    plan: 'free',
  }

  const mockPieceIds = ['piece-1', 'piece-2', 'piece-3']

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentTenant.mockReset()
  })

  describe('POST /api/pieces/bulk', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockGetCurrentTenant.mockResolvedValue(null)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            pieceIds: mockPieceIds,
            params: { status: 'available' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should return 400 when missing operation', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            pieceIds: mockPieceIds,
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Missing')
      })

      it('should return 400 when missing pieceIds', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            params: { status: 'available' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 when pieceIds is empty', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            pieceIds: [],
            params: { status: 'available' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 when pieceIds exceeds 100', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        const manyIds = Array.from({ length: 101 }, (_, i) => `piece-${i}`)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            pieceIds: manyIds,
            params: { status: 'available' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('100')
      })

      it('should return 400 for unknown operation', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'unknownOperation',
            pieceIds: mockPieceIds,
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Unknown')
      })
    })

    describe('updateStatus operation', () => {
      it('should update status for multiple pieces', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdateStatus).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            pieceIds: mockPieceIds,
            params: { status: 'available' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkUpdateStatus).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          'available',
        )
      })

      it('should return 400 for invalid status value', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStatus',
            pieceIds: mockPieceIds,
            params: { status: 'invalid-status' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid status')
      })

      it('should accept all valid status values', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdateStatus).mockResolvedValue({ modifiedCount: 3 })

        const validStatuses = ['draft', 'available', 'reserved', 'sold']

        for (const status of validStatuses) {
          const request = new NextRequest('http://localhost/api/pieces/bulk', {
            method: 'POST',
            body: JSON.stringify({
              operation: 'updateStatus',
              pieceIds: mockPieceIds,
              params: { status },
            }),
          })

          const response = await POST(request)
          expect(response.status).toBe(200)
        }
      })
    })

    describe('delete operation', () => {
      it('should delete multiple pieces', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkDelete).mockResolvedValue({ deletedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'delete',
            pieceIds: mockPieceIds,
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkDelete).toHaveBeenCalledWith('tenant-123', mockPieceIds)
      })
    })

    describe('updatePrices operation', () => {
      it('should increase prices by percentage', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdatePrices).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updatePrices',
            pieceIds: mockPieceIds,
            params: { type: 'percentage', direction: 'increase', value: 10 },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkUpdatePrices).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          { type: 'percentage', direction: 'increase', value: 10 },
        )
      })

      it('should decrease prices by fixed amount', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdatePrices).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updatePrices',
            pieceIds: mockPieceIds,
            params: { type: 'fixed', direction: 'decrease', value: 5 },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      })

      it('should return 400 when missing price params', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updatePrices',
            pieceIds: mockPieceIds,
            params: { type: 'percentage' }, // missing direction and value
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 for invalid adjustment type', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updatePrices',
            pieceIds: mockPieceIds,
            params: { type: 'invalid', direction: 'increase', value: 10 },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 for invalid direction', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updatePrices',
            pieceIds: mockPieceIds,
            params: { type: 'percentage', direction: 'invalid', value: 10 },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('updateStock operation', () => {
      it('should set stock to specific value', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdateStock).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStock',
            pieceIds: mockPieceIds,
            params: { stock: 10 },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkUpdateStock).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          10,
        )
      })

      it('should set stock to unlimited', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdateStock).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStock',
            pieceIds: mockPieceIds,
            params: { stock: 'unlimited' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkUpdateStock).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          'unlimited',
        )
      })

      it('should return 400 when missing stock value', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateStock',
            pieceIds: mockPieceIds,
            params: {},
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('updateCategory operation', () => {
      it('should update category for multiple pieces', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkUpdateCategory).mockResolvedValue({
          modifiedCount: 3,
        })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateCategory',
            pieceIds: mockPieceIds,
            params: { category: 'Jewelry' },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkUpdateCategory).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          'Jewelry',
        )
      })

      it('should return 400 when missing category', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'updateCategory',
            pieceIds: mockPieceIds,
            params: {},
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('addTags operation', () => {
      it('should add tags to multiple pieces', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkAddTags).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'addTags',
            pieceIds: mockPieceIds,
            params: { tags: ['sale', 'featured'] },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkAddTags).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          ['sale', 'featured'],
        )
      })

      it('should return 400 when missing tags array', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'addTags',
            pieceIds: mockPieceIds,
            params: {},
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should return 400 when tags array is empty', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'addTags',
            pieceIds: mockPieceIds,
            params: { tags: [] },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('removeTags operation', () => {
      it('should remove tags from multiple pieces', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkRemoveTags).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'removeTags',
            pieceIds: mockPieceIds,
            params: { tags: ['old-tag'] },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkRemoveTags).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          ['old-tag'],
        )
      })
    })

    describe('setFeatured operation', () => {
      it('should set featured status to true', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkSetFeatured).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'setFeatured',
            pieceIds: mockPieceIds,
            params: { isFeatured: true },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkSetFeatured).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          true,
        )
      })

      it('should set featured status to false', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkSetFeatured).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'setFeatured',
            pieceIds: mockPieceIds,
            params: { isFeatured: false },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      })

      it('should return 400 when missing isFeatured value', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'setFeatured',
            pieceIds: mockPieceIds,
            params: {},
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('setPublished operation', () => {
      it('should set published status to true', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)
        vi.mocked(bulk.bulkSetPublished).mockResolvedValue({ modifiedCount: 3 })

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'setPublished',
            pieceIds: mockPieceIds,
            params: { isPublished: true },
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(bulk.bulkSetPublished).toHaveBeenCalledWith(
          'tenant-123',
          mockPieceIds,
          true,
        )
      })

      it('should return 400 when missing isPublished value', async () => {
        mockGetCurrentTenant.mockResolvedValue(mockTenant)

        const request = new NextRequest('http://localhost/api/pieces/bulk', {
          method: 'POST',
          body: JSON.stringify({
            operation: 'setPublished',
            pieceIds: mockPieceIds,
            params: {},
          }),
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })
  })

  describe('GET /api/pieces/bulk (stats)', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/pieces/bulk?ids=piece-1,piece-2',
      )
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return stats for selected pieces', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(bulk.getBulkStats).mockResolvedValue({
        byStatus: { available: 2, draft: 1 },
        byCategory: { Jewelry: 3 },
        priceRange: { min: 10, max: 100 },
      })

      const request = new NextRequest(
        'http://localhost/api/pieces/bulk?ids=piece-1,piece-2,piece-3',
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.byStatus).toBeDefined()
      expect(data.priceRange).toBeDefined()
    })

    it('should return 400 when missing ids param', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/pieces/bulk')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })
})
