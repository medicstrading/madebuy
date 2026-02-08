import { discounts } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Import handlers AFTER mocks
import { GET, POST } from '../discounts/route'
import {
  DELETE,
  GET as GET_BY_ID,
  PATCH,
} from '../discounts/[id]/route'
import { GET as GET_STATS } from '../discounts/stats/route'

describe('Discounts API - GET /api/discounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/discounts')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns discounts list with parsed query params', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockDiscounts = [
      {
        id: 'discount-1',
        code: 'SAVE10',
        type: 'percentage',
        value: 10,
        isActive: true,
      },
    ]
    vi.mocked(discounts.listDiscountCodes).mockResolvedValue({
      discounts: mockDiscounts,
      total: 1,
    })

    const request = new NextRequest(
      'http://localhost/api/discounts?isActive=true&limit=20&sortBy=code&sortOrder=asc',
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.discounts).toEqual(mockDiscounts)
    expect(discounts.listDiscountCodes).toHaveBeenCalledWith(mockTenant.id, {
      isActive: true,
      limit: 20,
      sortBy: 'code',
      sortOrder: 'asc',
    })
  })

  it('handles isActive=false query param', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.listDiscountCodes).mockResolvedValue({
      discounts: [],
      total: 0,
    })

    const request = new NextRequest(
      'http://localhost/api/discounts?isActive=false',
    )
    await GET(request)

    expect(discounts.listDiscountCodes).toHaveBeenCalledWith(mockTenant.id, {
      isActive: false,
    })
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.listDiscountCodes).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/discounts')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Discounts API - POST /api/discounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify({ code: 'TEST' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('validates required fields', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify({ code: 'TEST' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Code, type, and value are required')
  })

  it('validates all required fields present', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify({ code: 'TEST', type: 'percentage' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Code, type, and value are required')
  })

  it('creates discount successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const discountData = {
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
    }

    const mockDiscount = { id: 'discount-1', ...discountData, isActive: true }
    vi.mocked(discounts.createDiscountCode).mockResolvedValue(mockDiscount)

    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify(discountData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.discount).toEqual(mockDiscount)
    expect(discounts.createDiscountCode).toHaveBeenCalledWith(
      mockTenant.id,
      discountData,
    )
  })

  it('returns 409 when duplicate code exists', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const error = new Error('Discount code already exists')
    vi.mocked(discounts.createDiscountCode).mockRejectedValue(error)

    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify({
        code: 'DUPLICATE',
        type: 'percentage',
        value: 10,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('A discount with this code already exists')
  })

  it('returns 500 on other database errors', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.createDiscountCode).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/discounts', {
      method: 'POST',
      body: JSON.stringify({
        code: 'TEST',
        type: 'percentage',
        value: 10,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Discounts API - GET /api/discounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/discounts/discount-1')
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when discount not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.getDiscountCodeById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/discounts/discount-1')
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Discount not found')
  })

  it('returns discount successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockDiscount = {
      id: 'discount-1',
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
    }
    vi.mocked(discounts.getDiscountCodeById).mockResolvedValue(mockDiscount)

    const request = new NextRequest('http://localhost/api/discounts/discount-1')
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.discount).toEqual(mockDiscount)
    expect(discounts.getDiscountCodeById).toHaveBeenCalledWith(
      mockTenant.id,
      'discount-1',
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.getDiscountCodeById).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/discounts/discount-1')
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Discounts API - PATCH /api/discounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH',
      body: JSON.stringify({ value: 15 }),
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when discount not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.updateDiscountCode).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH',
      body: JSON.stringify({ value: 15 }),
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Discount not found')
  })

  it('updates discount successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const updateData = { value: 15, isActive: false }
    const mockDiscount = { id: 'discount-1', code: 'SAVE10', ...updateData }
    vi.mocked(discounts.updateDiscountCode).mockResolvedValue(mockDiscount)

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.discount).toEqual(mockDiscount)
    expect(discounts.updateDiscountCode).toHaveBeenCalledWith(
      mockTenant.id,
      'discount-1',
      updateData,
    )
  })

  it('returns 409 when updating to duplicate code', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const error = new Error('Discount code already exists')
    vi.mocked(discounts.updateDiscountCode).mockRejectedValue(error)

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH',
      body: JSON.stringify({ code: 'DUPLICATE' }),
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('A discount with this code already exists')
  })

  it('returns 500 on other database errors', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.updateDiscountCode).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH',
      body: JSON.stringify({ value: 20 }),
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await PATCH(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Discounts API - DELETE /api/discounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when discount not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.deleteDiscountCode).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Discount not found')
  })

  it('deletes discount successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.deleteDiscountCode).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(discounts.deleteDiscountCode).toHaveBeenCalledWith(
      mockTenant.id,
      'discount-1',
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.deleteDiscountCode).mockRejectedValue(
      new Error('DB error'),
    )

    const request = new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'discount-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Discounts API - GET /api/discounts/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)

    const response = await GET_STATS()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns discount stats successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockStats = {
      totalDiscounts: 10,
      activeDiscounts: 7,
      totalUsage: 150,
      totalSavings: 15000,
    }
    vi.mocked(discounts.getDiscountStats).mockResolvedValue(mockStats)

    const response = await GET_STATS()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockStats)
    expect(discounts.getDiscountStats).toHaveBeenCalledWith(mockTenant.id)
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(discounts.getDiscountStats).mockRejectedValue(
      new Error('DB error'),
    )

    const response = await GET_STATS()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
