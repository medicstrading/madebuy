import { orders, pieces, reviews, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock rate limiters
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    reviews: vi.fn(() => null), // No rate limit by default
  },
}))

// Import handlers after mocks
import { GET as getReviews, POST as createReview } from '../reviews/route'
import { GET as getRecentReviews } from '../reviews/recent/route'
import { POST as markHelpful } from '../reviews/[reviewId]/helpful/route'
import { POST as reportReview } from '../reviews/[reviewId]/report/route'
import { POST as verifyPurchase } from '../reviews/verify-purchase/route'

describe('Reviews API - List Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get reviews for a piece', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockReviews = [
      { id: 'rev-1', rating: 5, text: 'Great product!' },
      { id: 'rev-2', rating: 4, text: 'Good quality' },
    ]
    const mockStats = { averageRating: 4.5, totalReviews: 2 }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(reviews.listApprovedReviews).mockResolvedValue(mockReviews as any)
    vi.mocked(reviews.getProductReviewStats).mockResolvedValue(mockStats as any)

    const request = new NextRequest('http://localhost/api/reviews?tenantId=tenant-1&pieceId=piece-1')
    const response = await getReviews(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reviews).toEqual(mockReviews)
    expect(data.stats).toEqual(mockStats)
  })

  it('should return 400 if tenantId or pieceId is missing', async () => {
    const request = new NextRequest('http://localhost/api/reviews?tenantId=tenant-1')
    const response = await getReviews(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('tenantId and pieceId are required')
  })

  it('should return 404 if tenant not found', async () => {
    vi.mocked(tenants.getTenantById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews?tenantId=invalid&pieceId=piece-1')
    const response = await getReviews(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Tenant not found')
  })

  it('should respect pagination parameters', async () => {
    const mockTenant = { id: 'tenant-1' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(reviews.listApprovedReviews).mockResolvedValue([])
    vi.mocked(reviews.getProductReviewStats).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/reviews?tenantId=tenant-1&pieceId=piece-1&limit=10&offset=20')
    const response = await getReviews(request)

    expect(response.status).toBe(200)
    expect(reviews.listApprovedReviews).toHaveBeenCalledWith('tenant-1', 'piece-1', {
      limit: 10,
      offset: 20,
    })
  })
})

describe('Reviews API - Create Review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a review with verified purchase', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1', name: 'Test Piece' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      tenantId: 'tenant-1',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      items: [{ pieceId: '507f1f77bcf86cd799439011', name: 'Test Piece', quantity: 1 }],
      status: 'delivered',
    }
    const mockReview = { id: 'rev-1', rating: 5, text: 'Great!' }

    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(mockOrder as any)
    vi.mocked(reviews.hasCustomerReviewedPiece).mockResolvedValue(false)
    vi.mocked(reviews.createReview).mockResolvedValue(mockReview as any)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.review).toEqual(mockReview)
  })

  it('should return 400 for invalid input', async () => {
    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        // Missing required fields
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Validation failed')
  })

  it('should return 404 if piece not found', async () => {
    vi.mocked(pieces.getPieceById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Product not found')
  })

  it('should return 403 if order not found', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1' }
    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Order not found')
  })

  it('should return 403 if email does not match order', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      customerEmail: 'real@example.com',
      items: [{ pieceId: '507f1f77bcf86cd799439011' }],
      status: 'delivered',
    }

    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(mockOrder as any)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'fake@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('does not belong to your account')
  })

  it('should return 403 if product not in order', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      customerEmail: 'test@example.com',
      items: [{ pieceId: '507f1f77bcf86cd799439099' }], // Different piece
      status: 'delivered',
    }

    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(mockOrder as any)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('product was not in your order')
  })

  it('should return 403 if order not completed', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      customerEmail: 'test@example.com',
      items: [{ pieceId: '507f1f77bcf86cd799439011' }],
      status: 'pending', // Not completed
    }

    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(mockOrder as any)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('completed orders')
  })

  it('should return 400 if customer already reviewed', async () => {
    const mockPiece = { id: '507f1f77bcf86cd799439011', tenantId: 'tenant-1' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      customerEmail: 'test@example.com',
      items: [{ pieceId: '507f1f77bcf86cd799439011' }],
      status: 'delivered',
    }

    vi.mocked(pieces.getPieceById).mockResolvedValue(mockPiece as any)
    vi.mocked(orders.getOrder).mockResolvedValue(mockOrder as any)
    vi.mocked(reviews.hasCustomerReviewedPiece).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        pieceId: '507f1f77bcf86cd799439011',
        orderId: '507f1f77bcf86cd799439012',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        rating: 5,
        text: 'Great product, highly recommend!',
      }),
    })

    const response = await createReview(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('already reviewed')
  })
})

describe('Reviews API - Recent Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get recent reviews', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockReviews = [{ id: 'rev-1', rating: 5 }]
    const mockStats = { averageRating: 5 }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(reviews.listRecentApprovedReviews).mockResolvedValue(mockReviews as any)
    vi.mocked(reviews.getTenantReviewStats).mockResolvedValue(mockStats as any)

    const request = new NextRequest('http://localhost/api/reviews/recent?tenantId=tenant-1')
    const response = await getRecentReviews(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reviews).toEqual(mockReviews)
    expect(data.stats).toEqual(mockStats)
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/reviews/recent')
    const response = await getRecentReviews(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })
})

describe('Reviews API - Mark Helpful', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mark review as helpful', async () => {
    const mockReview = { id: 'rev-1', tenantId: 'tenant-1' }
    vi.mocked(reviews.getReviewById).mockResolvedValue(mockReview as any)
    vi.mocked(reviews.markReviewHelpful).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/reviews/rev-1/helpful', {
      method: 'POST',
    })
    const response = await markHelpful(request, { params: { reviewId: 'rev-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 404 if review not found', async () => {
    vi.mocked(reviews.getReviewById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews/invalid/helpful', {
      method: 'POST',
    })
    const response = await markHelpful(request, { params: { reviewId: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Review not found')
  })

  it('should return 409 if already marked helpful', async () => {
    const mockReview = { id: 'rev-1', tenantId: 'tenant-1' }
    vi.mocked(reviews.getReviewById).mockResolvedValue(mockReview as any)
    vi.mocked(reviews.markReviewHelpful).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/reviews/rev-1/helpful', {
      method: 'POST',
    })
    const response = await markHelpful(request, { params: { reviewId: 'rev-1' } })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('already marked')
  })
})

describe('Reviews API - Report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should report review', async () => {
    const mockReview = { id: 'rev-1', tenantId: 'tenant-1' }
    vi.mocked(reviews.getReviewById).mockResolvedValue(mockReview as any)
    vi.mocked(reviews.reportReview).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/reviews/rev-1/report', {
      method: 'POST',
    })
    const response = await reportReview(request, { params: { reviewId: 'rev-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 404 if review not found', async () => {
    vi.mocked(reviews.getReviewById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews/invalid/report', {
      method: 'POST',
    })
    const response = await reportReview(request, { params: { reviewId: 'invalid' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Review not found')
  })
})

describe('Reviews API - Verify Purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify purchase eligibility', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockOrder = {
      id: '507f1f77bcf86cd799439012',
      customerName: 'Test User',
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(orders.findDeliveredOrderWithProduct).mockResolvedValue(mockOrder as any)
    vi.mocked(reviews.hasReviewedOrder).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/reviews/verify-purchase', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        pieceId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      }),
    })

    const response = await verifyPurchase(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canReview).toBe(true)
    expect(data.orderId).toBe('507f1f77bcf86cd799439012')
  })

  it('should return 400 if parameters are missing', async () => {
    const request = new NextRequest('http://localhost/api/reviews/verify-purchase', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await verifyPurchase(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('should return canReview false if no verified purchase', async () => {
    const mockTenant = { id: 'tenant-1' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(orders.findDeliveredOrderWithProduct).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/reviews/verify-purchase', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        pieceId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      }),
    })

    const response = await verifyPurchase(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canReview).toBe(false)
    expect(data.reason).toContain('No verified purchase')
  })

  it('should return canReview false if already reviewed', async () => {
    const mockTenant = { id: 'tenant-1' }
    const mockOrder = { id: '507f1f77bcf86cd799439012', customerName: 'Test User' }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(orders.findDeliveredOrderWithProduct).mockResolvedValue(mockOrder as any)
    vi.mocked(reviews.hasReviewedOrder).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/reviews/verify-purchase', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        pieceId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      }),
    })

    const response = await verifyPurchase(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canReview).toBe(false)
    expect(data.alreadyReviewed).toBe(true)
  })
})
