import { reviews } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Import handlers AFTER mocks
import { GET } from '../reviews/route'
import { DELETE, GET as GET_BY_ID } from '../reviews/[id]/route'
import { POST as MODERATE } from '../reviews/[id]/moderate/route'

describe('Reviews API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    slug: 'test-shop',
  }

  const mockReview = {
    id: 'review-1',
    tenantId: 'tenant-123',
    pieceId: 'piece-1',
    customerId: 'customer-1',
    rating: 5,
    comment: 'Great product!',
    status: 'pending',
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/reviews', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reviews')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should list all reviews successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.listReviews).mockResolvedValue([mockReview])

      const request = new NextRequest('http://localhost/api/reviews')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toHaveLength(1)
      expect(data.reviews[0].id).toBe('review-1')
      expect(reviews.listReviews).toHaveBeenCalledWith('tenant-123', {
        filters: {},
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    })

    it('should filter by status', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.listReviews).mockResolvedValue([mockReview])

      const request = new NextRequest('http://localhost/api/reviews?status=approved')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(reviews.listReviews).toHaveBeenCalledWith('tenant-123', {
        filters: { status: 'approved' },
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    })

    it('should filter by pieceId', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.listReviews).mockResolvedValue([mockReview])

      const request = new NextRequest('http://localhost/api/reviews?pieceId=piece-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(reviews.listReviews).toHaveBeenCalledWith('tenant-123', {
        filters: { pieceId: 'piece-1' },
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    })

    it('should support pagination', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.listReviews).mockResolvedValue([mockReview])

      const request = new NextRequest('http://localhost/api/reviews?limit=10&offset=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(reviews.listReviews).toHaveBeenCalledWith('tenant-123', {
        filters: {},
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    })
  })

  describe('GET /api/reviews/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reviews/review-1')
      const response = await GET_BY_ID(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if review not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reviews/review-1')
      const response = await GET_BY_ID(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should get review successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(mockReview)

      const request = new NextRequest('http://localhost/api/reviews/review-1')
      const response = await GET_BY_ID(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.review.id).toBe('review-1')
      expect(reviews.getReview).toHaveBeenCalledWith('tenant-123', 'review-1')
    })
  })

  describe('DELETE /api/reviews/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reviews/review-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if review not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reviews/review-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should delete review successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(mockReview)
      vi.mocked(reviews.deleteReview).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/reviews/review-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(reviews.deleteReview).toHaveBeenCalledWith('tenant-123', 'review-1')
    })
  })

  describe('POST /api/reviews/[id]/moderate', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const formData = new FormData()
      formData.append('status', 'approved')

      const request = new NextRequest('http://localhost/api/reviews/review-1/moderate', {
        method: 'POST',
        body: formData,
      })
      const response = await MODERATE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if review not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(null)

      const formData = new FormData()
      formData.append('status', 'approved')

      const request = new NextRequest('http://localhost/api/reviews/review-1/moderate', {
        method: 'POST',
        body: formData,
      })
      const response = await MODERATE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should return 400 for invalid status', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(mockReview)

      const formData = new FormData()
      formData.append('status', 'invalid')

      const request = new NextRequest('http://localhost/api/reviews/review-1/moderate', {
        method: 'POST',
        body: formData,
      })
      const response = await MODERATE(request, { params: { id: 'review-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status')
    })

    it('should moderate review successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(reviews.getReview).mockResolvedValue(mockReview)
      vi.mocked(reviews.moderateReview).mockResolvedValue({
        ...mockReview,
        status: 'approved',
      })

      const formData = new FormData()
      formData.append('status', 'approved')
      formData.append('sellerResponse', 'Thank you!')

      const request = new NextRequest('http://localhost/api/reviews/review-1/moderate', {
        method: 'POST',
        body: formData,
      })
      const response = await MODERATE(request, { params: { id: 'review-1' } })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/dashboard/reviews')
      expect(reviews.moderateReview).toHaveBeenCalledWith('tenant-123', 'review-1', {
        status: 'approved',
        sellerResponse: 'Thank you!',
      })
    })
  })
})
