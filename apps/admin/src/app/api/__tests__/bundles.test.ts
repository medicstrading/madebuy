import { bundles } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Import handlers AFTER mocks
import { GET, POST } from '../bundles/route'
import {
  DELETE,
  GET as GET_BY_ID,
  PUT,
} from '../bundles/[id]/route'

describe('Bundles API - GET /api/bundles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/bundles')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns bundles list with parsed query params', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockBundles = [
      {
        id: 'bundle-1',
        name: 'Test Bundle',
        pieces: [{ pieceId: 'piece-1', quantity: 2 }],
        bundlePrice: 5000,
        status: 'active',
      },
    ]
    vi.mocked(bundles.listBundles).mockResolvedValue({
      bundles: mockBundles,
      total: 1,
    })

    const request = new NextRequest(
      'http://localhost/api/bundles?status=active&limit=10&sortBy=createdAt&sortOrder=desc',
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bundles).toEqual(mockBundles)
    expect(bundles.listBundles).toHaveBeenCalledWith(mockTenant.id, {
      status: 'active',
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  })

  it('handles comma-separated status values', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.listBundles).mockResolvedValue({ bundles: [], total: 0 })

    const request = new NextRequest(
      'http://localhost/api/bundles?status=active,draft',
    )
    await GET(request)

    expect(bundles.listBundles).toHaveBeenCalledWith(mockTenant.id, {
      status: ['active', 'draft'],
    })
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.listBundles).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/bundles')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Bundles API - POST /api/bundles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('validates required name field', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({
        pieces: [{ pieceId: 'piece-1', quantity: 2 }],
        bundlePrice: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
  })

  it('validates at least one piece is required', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Bundle',
        pieces: [],
        bundlePrice: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('At least one piece is required in a bundle')
  })

  it('validates bundle price is valid', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Bundle',
        pieces: [{ pieceId: 'piece-1', quantity: 2 }],
        bundlePrice: -100,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Valid bundle price is required')
  })

  it('validates piece quantities', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Bundle',
        pieces: [{ pieceId: 'piece-1', quantity: 0 }],
        bundlePrice: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Each piece must have a valid pieceId and quantity >= 1',
    )
  })

  it('creates bundle successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const bundleData = {
      name: 'Test Bundle',
      pieces: [{ pieceId: 'piece-1', quantity: 2 }],
      bundlePrice: 5000,
    }

    const mockBundle = { id: 'bundle-1', ...bundleData }
    vi.mocked(bundles.createBundle).mockResolvedValue(mockBundle)

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify(bundleData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.bundle).toEqual(mockBundle)
    expect(bundles.createBundle).toHaveBeenCalledWith(mockTenant.id, bundleData)
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.createBundle).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/bundles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        pieces: [{ pieceId: 'p1', quantity: 1 }],
        bundlePrice: 100,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Bundles API - GET /api/bundles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/bundles/bundle-1')
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when bundle not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.getBundle).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1')
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Bundle not found')
  })

  it('returns bundle without pieces by default', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockBundle = { id: 'bundle-1', name: 'Test' }
    vi.mocked(bundles.getBundle).mockResolvedValue(mockBundle)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1')
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bundle).toEqual(mockBundle)
    expect(bundles.getBundle).toHaveBeenCalledWith(mockTenant.id, 'bundle-1')
  })

  it('returns bundle with pieces when withPieces=true', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const mockBundle = {
      id: 'bundle-1',
      name: 'Test',
      pieces: [{ pieceId: 'p1', piece: { name: 'Piece 1' } }],
    }
    vi.mocked(bundles.getBundleWithPieces).mockResolvedValue(mockBundle)

    const request = new NextRequest(
      'http://localhost/api/bundles/bundle-1?withPieces=true',
    )
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bundle).toEqual(mockBundle)
    expect(bundles.getBundleWithPieces).toHaveBeenCalledWith(
      mockTenant.id,
      'bundle-1',
    )
  })

  it('returns 404 when bundle not found with pieces', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.getBundleWithPieces).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/bundles/bundle-1?withPieces=true',
    )
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Bundle not found')
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.getBundle).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/bundles/bundle-1')
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Bundles API - PUT /api/bundles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('validates pieces array if provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({ pieces: [] }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bundle must have at least one piece')
  })

  it('validates piece quantities if pieces provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({
        pieces: [{ pieceId: 'p1', quantity: 0 }],
      }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Each piece must have a valid pieceId and quantity >= 1',
    )
  })

  it('validates bundle price if provided', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({ bundlePrice: -100 }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bundle price cannot be negative')
  })

  it('returns 404 when bundle not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.updateBundle).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Bundle not found')
  })

  it('updates bundle successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)

    const updateData = { name: 'Updated Bundle', bundlePrice: 6000 }
    const mockBundle = { id: 'bundle-1', ...updateData }
    vi.mocked(bundles.updateBundle).mockResolvedValue(mockBundle)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bundle).toEqual(mockBundle)
    expect(bundles.updateBundle).toHaveBeenCalledWith(
      mockTenant.id,
      'bundle-1',
      updateData,
    )
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.updateBundle).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await PUT(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('Bundles API - DELETE /api/bundles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentTenant).mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when bundle not found', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.deleteBundle).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Bundle not found')
  })

  it('deletes bundle successfully', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.deleteBundle).mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(bundles.deleteBundle).toHaveBeenCalledWith(mockTenant.id, 'bundle-1')
  })

  it('returns 500 on database error', async () => {
    const mockTenant = { id: 'tenant-123' }
    vi.mocked(getCurrentTenant).mockResolvedValue(mockTenant)
    vi.mocked(bundles.deleteBundle).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/bundles/bundle-1', {
      method: 'DELETE',
    })
    const params = Promise.resolve({ id: 'bundle-1' })

    const response = await DELETE(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
