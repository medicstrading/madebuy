import { customers } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

const mockGetCurrentTenant = vi.fn()

vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Import handlers AFTER mocks
import { GET as listCustomers, POST as createCustomer } from '../customers/route'
import {
  GET as getCustomer,
  PATCH as updateCustomer,
  DELETE as deleteCustomer,
} from '../customers/[id]/route'
import { GET as getCustomerStats } from '../customers/stats/route'
import { GET as exportCustomers } from '../customers/export/route'

describe('GET /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers')

    const response = await listCustomers(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns paginated customers list', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.listCustomers).mockResolvedValue({
      customers: [
        {
          id: 'cust-1',
          tenantId: 'tenant-123',
          email: 'customer@example.com',
          name: 'John Doe',
          totalOrders: 5,
          totalSpent: 250.0,
          averageOrderValue: 50.0,
          emailSubscribed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    })

    const request = createRequest('/api/customers?page=1&limit=50')

    const response = await listCustomers(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      customers: [{ id: 'cust-1', email: 'customer@example.com' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    expect(customers.listCustomers).toHaveBeenCalledWith(
      'tenant-123',
      {},
      { page: 1, limit: 50 },
    )
  })

  it('filters customers by parameters', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.listCustomers).mockResolvedValue({
      customers: [],
      total: 0,
    })

    const request = createRequest(
      '/api/customers?emailSubscribed=true&minSpent=100&minOrders=3&acquisitionSource=facebook',
    )

    await listCustomers(request)

    expect(customers.listCustomers).toHaveBeenCalledWith(
      'tenant-123',
      {
        emailSubscribed: true,
        minSpent: 100,
        minOrders: 3,
        acquisitionSource: 'facebook',
      },
      { page: 1, limit: 50 },
    )
  })
})

describe('POST /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers', {
      method: 'POST',
      body: { email: 'new@example.com', name: 'New Customer' },
    })

    const response = await createCustomer(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when email is missing', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/customers', {
      method: 'POST',
      body: { name: 'New Customer' },
    })

    const response = await createCustomer(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'Email and name are required',
    })
  })

  it('returns 409 when customer already exists', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerByEmail).mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-123',
      email: 'existing@example.com',
      name: 'Existing Customer',
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      emailSubscribed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = createRequest('/api/customers', {
      method: 'POST',
      body: { email: 'existing@example.com', name: 'New Customer' },
    })

    const response = await createCustomer(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toMatchObject({
      error: 'A customer with this email already exists',
    })
  })

  it('creates customer successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerByEmail).mockResolvedValue(null)
    const newCustomer = {
      id: 'cust-new',
      tenantId: 'tenant-123',
      email: 'new@example.com',
      name: 'New Customer',
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      emailSubscribed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(customers.createOrUpdateCustomer).mockResolvedValue(newCustomer)
    vi.mocked(customers.getCustomerById).mockResolvedValue(newCustomer)

    const request = createRequest('/api/customers', {
      method: 'POST',
      body: {
        email: 'new@example.com',
        name: 'New Customer',
        phone: '123456789',
        emailSubscribed: true,
      },
    })

    const response = await createCustomer(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      customer: { id: 'cust-new', email: 'new@example.com' },
    })
  })
})

describe('GET /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-1')

    const response = await getCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when customer not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerById).mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-999')

    const response = await getCustomer(request, {
      params: Promise.resolve({ id: 'cust-999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Customer not found',
    })
  })

  it('returns customer without orders', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerById).mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-123',
      email: 'customer@example.com',
      name: 'John Doe',
      totalOrders: 5,
      totalSpent: 250.0,
      averageOrderValue: 50.0,
      emailSubscribed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const request = createRequest('/api/customers/cust-1')

    const response = await getCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      customer: { id: 'cust-1', email: 'customer@example.com' },
    })
  })

  it('returns customer with orders when requested', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerWithOrders).mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-123',
      email: 'customer@example.com',
      name: 'John Doe',
      totalOrders: 5,
      totalSpent: 250.0,
      averageOrderValue: 50.0,
      emailSubscribed: true,
      orders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const request = createRequest('/api/customers/cust-1?includeOrders=true')

    const response = await getCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(customers.getCustomerWithOrders).toHaveBeenCalledWith('tenant-123', 'cust-1')
  })
})

describe('PATCH /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    })

    const response = await updateCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when customer not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerById).mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-999', {
      method: 'PATCH',
      body: { name: 'Updated' },
    })

    const response = await updateCustomer(request, {
      params: Promise.resolve({ id: 'cust-999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Customer not found',
    })
  })

  it('updates customer successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const existingCustomer = {
      id: 'cust-1',
      tenantId: 'tenant-123',
      email: 'customer@example.com',
      name: 'John Doe',
      totalOrders: 5,
      totalSpent: 250.0,
      averageOrderValue: 50.0,
      emailSubscribed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(customers.getCustomerById)
      .mockResolvedValueOnce(existingCustomer)
      .mockResolvedValueOnce({ ...existingCustomer, name: 'Updated Name' })

    const request = createRequest('/api/customers/cust-1', {
      method: 'PATCH',
      body: { name: 'Updated Name', emailSubscribed: false },
    })

    const response = await updateCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(customers.updateCustomer).toHaveBeenCalledWith('tenant-123', 'cust-1', {
      name: 'Updated Name',
      emailSubscribed: false,
    })
  })
})

describe('DELETE /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-1', { method: 'DELETE' })

    const response = await deleteCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when customer not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerById).mockResolvedValue(null)
    const request = createRequest('/api/customers/cust-999', { method: 'DELETE' })

    const response = await deleteCustomer(request, {
      params: Promise.resolve({ id: 'cust-999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Customer not found',
    })
  })

  it('deletes customer successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerById).mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-123',
      email: 'customer@example.com',
      name: 'John Doe',
      totalOrders: 5,
      totalSpent: 250.0,
      averageOrderValue: 50.0,
      emailSubscribed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(customers.deleteCustomer).mockResolvedValue(true)

    const request = createRequest('/api/customers/cust-1', { method: 'DELETE' })

    const response = await deleteCustomer(request, {
      params: Promise.resolve({ id: 'cust-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
    })
    expect(customers.deleteCustomer).toHaveBeenCalledWith('tenant-123', 'cust-1')
  })
})

describe('GET /api/customers/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers/stats')

    const response = await getCustomerStats(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns customer statistics', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.getCustomerStats).mockResolvedValue({
      totalCustomers: 100,
      activeCustomers: 80,
      newThisMonth: 10,
      averageLifetimeValue: 500.0,
    })
    vi.mocked(customers.getTopCustomers).mockResolvedValue([])
    vi.mocked(customers.getAcquisitionSources).mockResolvedValue([])

    const request = createRequest('/api/customers/stats')

    const response = await getCustomerStats(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      stats: { totalCustomers: 100, activeCustomers: 80 },
      topCustomers: [],
      acquisitionSources: [],
    })
  })
})

describe('GET /api/customers/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/customers/export')

    const response = await exportCustomers(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('exports customers as CSV', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(customers.exportCustomers).mockResolvedValue([
      {
        id: 'cust-1',
        tenantId: 'tenant-123',
        email: 'customer@example.com',
        name: 'John Doe',
        totalOrders: 5,
        totalSpent: 250.0,
        averageOrderValue: 50.0,
        emailSubscribed: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      },
    ])

    const request = createRequest('/api/customers/export?emailSubscribed=true')

    const response = await exportCustomers(request)
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('Content-Disposition')).toContain('customers-test-shop-')
    expect(text).toContain('Email,Name,Phone')
    expect(text).toContain('customer@example.com,John Doe')
  })
})
