import { domains } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Import handlers AFTER mocks
import { DELETE, GET, POST } from '../domain/route'
import { POST as VERIFY } from '../domain/verify/route'

describe('Domain API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    slug: 'test-shop',
    features: {
      customDomain: true,
    },
    customDomain: null,
  }

  const mockDomainStatus = {
    domain: 'example.com',
    verificationToken: 'verify-token-123',
    isVerified: false,
    verifiedAt: null,
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/domain', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should get domain status successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(domains.getDomainStatus).mockResolvedValue(mockDomainStatus)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.domain).toBe('example.com')
      expect(data.verificationToken).toBe('verify-token-123')
      expect(data.hasCustomDomainFeature).toBe(true)
      expect(data.setupInstructions).toBeDefined()
      expect(data.setupInstructions.cname.value).toBe('shops.madebuy.com.au')
      expect(data.setupInstructions.txt.value).toBe('verify-token-123')
    })
  })

  describe('POST /api/domain', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/domain', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if custom domain feature not enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        features: { customDomain: false },
      })

      const request = new NextRequest('http://localhost/api/domain', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Custom domains require a Pro or higher plan')
    })

    it('should return 400 if domain is missing', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/domain', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Domain is required')
    })

    it('should return 400 if domain is invalid', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(domains.setCustomDomain).mockResolvedValue({
        success: false,
        message: 'Invalid domain format',
      })

      const request = new NextRequest('http://localhost/api/domain', {
        method: 'POST',
        body: JSON.stringify({ domain: 'invalid-domain' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid domain format')
    })

    it('should set custom domain successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(domains.setCustomDomain).mockResolvedValue({
        success: true,
        message: 'Domain set successfully',
      })
      vi.mocked(domains.getDomainStatus).mockResolvedValue(mockDomainStatus)

      const request = new NextRequest('http://localhost/api/domain', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Domain set successfully')
      expect(data.domain).toBe('example.com')
      expect(data.setupInstructions).toBeDefined()
      expect(domains.setCustomDomain).toHaveBeenCalledWith('tenant-123', 'example.com')
    })
  })

  describe('DELETE /api/domain', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should remove custom domain successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(domains.removeCustomDomain).mockResolvedValue()

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(domains.removeCustomDomain).toHaveBeenCalledWith('tenant-123')
    })
  })

  describe('POST /api/domain/verify', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await VERIFY()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if no custom domain configured', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        customDomain: null,
      })

      const response = await VERIFY()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No custom domain configured')
    })

    it('should verify domain successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        customDomain: 'example.com',
      })
      vi.mocked(domains.verifyDomain).mockResolvedValue({
        success: true,
        verified: true,
        message: 'Domain verified successfully',
      })

      const response = await VERIFY()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.verified).toBe(true)
      expect(domains.verifyDomain).toHaveBeenCalledWith('tenant-123', 'example.com')
    })

    it('should return verification failure', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        customDomain: 'example.com',
      })
      vi.mocked(domains.verifyDomain).mockResolvedValue({
        success: false,
        verified: false,
        message: 'DNS records not found',
      })

      const response = await VERIFY()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.verified).toBe(false)
      expect(data.message).toBe('DNS records not found')
    })
  })
})
