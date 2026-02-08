import { enquiries, tenants, tracking } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'mb_attribution') return { value: JSON.stringify({ source: 'google', medium: 'cpc' }) }
      if (name === 'mb_session') return { value: 'session-123' }
      return undefined
    }),
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => null), // No rate limit by default
}))

// Import handler after mocks
import { POST as submitEnquiry } from '../enquiry/route'

describe('Enquiry API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    // Don't set TURNSTILE_SECRET_KEY - most tests don't need captcha
    delete process.env.TURNSTILE_SECRET_KEY
  })

  it('should submit enquiry successfully', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockEnquiry = {
      id: 'enq-1',
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello',
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(null)
    vi.mocked(enquiries.createEnquiry).mockResolvedValue(mockEnquiry as any)
    vi.mocked(tracking.logEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question.',
        source: 'shop',
      }),
    })

    const response = await submitEnquiry(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.enquiry).toEqual(mockEnquiry)
    expect(enquiries.createEnquiry).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello, I have a question.',
    }))
  })

  it('should return 400 for validation errors', async () => {
    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        // Missing required fields
      }),
    })

    const response = await submitEnquiry(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Validation failed')
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question about this.',
        source: 'shop',
      }),
    })

    const response = await submitEnquiry(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should return 404 if tenant not found', async () => {
    vi.mocked(tenants.getTenantById).mockResolvedValue(null)
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'invalid-tenant',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question about your products.',
        source: 'shop',
      }),
    })

    const response = await submitEnquiry(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.code).toBe('NOT_FOUND')
  })

  it('should include attribution data from cookies', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(enquiries.createEnquiry).mockResolvedValue({} as any)
    vi.mocked(tracking.logEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question about your products.',
        source: 'shop',
      }),
    })

    const response = await submitEnquiry(request)

    expect(response.status).toBe(201)
    expect(enquiries.createEnquiry).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      trafficSource: 'google',
      trafficMedium: 'cpc',
      sessionId: 'session-123',
    }))
  })

  it('should handle optional piece information', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(enquiries.createEnquiry).mockResolvedValue({} as any)
    vi.mocked(tracking.logEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Question about this product',
        source: 'shop',
        pieceId: '507f1f77bcf86cd799439011',
        pieceName: 'Test Product',
      }),
    })

    const response = await submitEnquiry(request)

    expect(response.status).toBe(201)
    expect(enquiries.createEnquiry).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      pieceId: '507f1f77bcf86cd799439011',
      pieceName: 'Test Product',
    }))
  })

  it('should verify Turnstile token in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')

    // Mock fetch for Turnstile verification
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    } as any)

    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(enquiries.createEnquiry).mockResolvedValue({} as any)
    vi.mocked(tracking.logEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question about your products.',
        source: 'shop',
        turnstileToken: 'valid-token',
      }),
    })

    const response = await submitEnquiry(request)

    expect(response.status).toBe(201)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.any(Object)
    )
  })

  it('should return 400 if Turnstile token is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test User',
        email: 'test@example.com',
        message: 'Hello, I have a question about your products.',
        source: 'shop',
        // No turnstileToken
      }),
    })

    const response = await submitEnquiry(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should sanitize input text fields (strip control characters)', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(enquiries.createEnquiry).mockResolvedValue({} as any)
    vi.mocked(tracking.logEvent).mockResolvedValue(undefined)

    // sanitizeInput strips control chars and null bytes, not HTML
    const request = new NextRequest('http://localhost/api/enquiry', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Test\x00User\x01Name',
        email: 'test@example.com',
        message: 'Hello there, question about products\x00\x7F',
        source: 'shop',
      }),
    })

    const response = await submitEnquiry(request)

    expect(response.status).toBe(201)
    expect(enquiries.createEnquiry).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      name: 'TestUserName',
      message: 'Hello there, question about products',
    }))
  })
})
