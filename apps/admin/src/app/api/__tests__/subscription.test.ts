import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

const mockGetSubscriptionSummary = vi.fn()
const mockCheckCanAddPiece = vi.fn()
const mockCheckCanAddMedia = vi.fn()
const mockCheckFeatureAccess = vi.fn()

vi.mock('@/lib/subscription-check', () => ({
  getSubscriptionSummary: (tenant: unknown) => mockGetSubscriptionSummary(tenant),
  checkCanAddPiece: (tenant: unknown) => mockCheckCanAddPiece(tenant),
  checkCanAddMedia: (tenant: unknown, count: number) => mockCheckCanAddMedia(tenant, count),
  checkFeatureAccess: (tenant: unknown, feature: string) => mockCheckFeatureAccess(tenant, feature),
}))

// Import handlers AFTER mocks
import { GET } from '../subscription/route'
import { POST } from '../subscription/check/route'

describe('Subscription API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/subscription', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return subscription summary for free plan', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        plan: 'free',
        stripeCustomerId: null,
        subscriptionId: null,
      })

      mockGetSubscriptionSummary.mockResolvedValue({
        plan: 'free',
        pieces: { current: 5, limit: 10, canAdd: true },
        media: { current: 20, limit: 50, canAdd: true },
        features: {
          socialPublishing: false,
          aiCaptions: false,
          unlimitedPieces: false,
          customDomain: false,
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBe('free')
      expect(data.pieces.limit).toBe(10)
      expect(data.stripeCustomerId).toBe(null)
      expect(data.subscriptionId).toBe(null)
    })

    it('should return subscription summary for paid plan', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        plan: 'professional',
        stripeCustomerId: 'cus_123',
        subscriptionId: 'sub_123',
      })

      mockGetSubscriptionSummary.mockResolvedValue({
        plan: 'professional',
        pieces: { current: 50, limit: 500, canAdd: true },
        media: { current: 200, limit: 5000, canAdd: true },
        features: {
          socialPublishing: true,
          aiCaptions: true,
          unlimitedPieces: false,
          customDomain: true,
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBe('professional')
      expect(data.pieces.limit).toBe(500)
      expect(data.stripeCustomerId).toBe('configured')
      expect(data.subscriptionId).toBe('active')
    })
  })

  describe('POST /api/subscription/check', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addPiece' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when action is missing', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing action')
    })

    it('should check addPiece action successfully', async () => {
      const tenant = {
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      }

      mockGetCurrentTenant.mockResolvedValue(tenant)
      mockCheckCanAddPiece.mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 10,
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addPiece' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
      expect(mockCheckCanAddPiece).toHaveBeenCalledWith(tenant)
    })

    it('should check addMedia action successfully', async () => {
      const tenant = {
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      }

      mockGetCurrentTenant.mockResolvedValue(tenant)
      mockCheckCanAddMedia.mockReturnValue({
        allowed: true,
        current: 20,
        limit: 50,
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addMedia',
          params: { currentMediaCount: 20 },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
      expect(mockCheckCanAddMedia).toHaveBeenCalledWith(tenant, 20)
    })

    it('should return 400 when addMedia is missing currentMediaCount', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addMedia',
          params: {},
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing currentMediaCount parameter')
    })

    it('should check feature access successfully', async () => {
      const tenant = {
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'professional',
      }

      mockGetCurrentTenant.mockResolvedValue(tenant)
      mockCheckFeatureAccess.mockReturnValue({
        allowed: true,
        feature: 'socialPublishing',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feature',
          params: { feature: 'socialPublishing' },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
      expect(mockCheckFeatureAccess).toHaveBeenCalledWith(tenant, 'socialPublishing')
    })

    it('should return 400 when feature parameter is missing', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feature',
          params: {},
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing feature parameter')
    })

    it('should return 400 for invalid feature name', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feature',
          params: { feature: 'invalidFeature' },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid feature')
    })

    it('should return 400 for unknown action', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknownAction' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unknown action')
    })
  })
})
