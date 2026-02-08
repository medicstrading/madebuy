import { discounts, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => null), // No rate limit by default
}))

// Import handler after mocks
import { POST as validateDiscount } from '../discounts/validate/route'

describe('Discounts API - Validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate a valid discount code', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = {
      valid: true,
      discount: {
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
      },
      discountAmount: 1000, // $10 off
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'SAVE10',
        orderTotal: 10000,
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.discount.code).toBe('SAVE10')
    expect(data.discountAmount).toBe(1000)
  })

  it('should return 400 if required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        // Missing code and orderTotal
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('should return 400 for invalid input types', async () => {
    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'SAVE10',
        orderTotal: 'not-a-number',
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input type')
  })

  it('should return 400 if tenant not found', async () => {
    vi.mocked(tenants.getTenantById).mockResolvedValue(null)
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'invalid-tenant',
        code: 'SAVE10',
        orderTotal: 10000,
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid tenant')
  })

  it('should handle expired discount code', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = {
      valid: false,
      error: 'expired',
      message: 'This discount code has expired',
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'EXPIRED',
        orderTotal: 10000,
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('expired')
  })

  it('should handle invalid discount code', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = {
      valid: false,
      error: 'not_found',
      message: 'Discount code not found',
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'INVALID',
        orderTotal: 10000,
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('not_found')
  })

  it('should handle minimum order amount requirement', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = {
      valid: false,
      error: 'min_order_not_met',
      message: 'Order must be at least $50 to use this discount',
      minOrderAmount: 5000,
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'SAVE10',
        orderTotal: 3000, // Below minimum
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('min_order_not_met')
  })

  it('should pass optional pieceIds and customerEmail', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = { valid: true, discount: { code: 'SAVE10' }, discountAmount: 1000 }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'SAVE10',
        orderTotal: 10000,
        pieceIds: ['piece-1', 'piece-2'],
        customerEmail: 'test@example.com',
      }),
    })

    const response = await validateDiscount(request)

    expect(response.status).toBe(200)
    expect(discounts.validateDiscountCode).toHaveBeenCalledWith(
      'tenant-1',
      'SAVE10',
      10000,
      ['piece-1', 'piece-2'],
      'test@example.com'
    )
  })

  it('should handle max uses reached', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResult = {
      valid: false,
      error: 'max_uses_reached',
      message: 'This discount code has reached its maximum number of uses',
    }

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(discounts.validateDiscountCode).mockResolvedValue(mockResult as any)

    const request = new NextRequest('http://localhost/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        code: 'LIMITED',
        orderTotal: 10000,
      }),
    })

    const response = await validateDiscount(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('max_uses_reached')
  })
})
