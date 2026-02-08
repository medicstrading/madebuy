import { pieces, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock rate limiters
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    search: vi.fn(() => null), // No rate limit by default
  },
}))

// Import handlers after mocks
import { GET as getPieces } from '../pieces/route'
import { GET as getCollections } from '../collections/route'
import { GET as getBundles } from '../bundles/route'
import { GET as getSearch } from '../search/route'

describe('Public API - Pieces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return pieces with tenantId', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockPieces = [
      { id: 'piece-1', name: 'Test Piece', status: 'available' },
      { id: 'piece-2', name: 'Another Piece', status: 'available' },
    ]

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.listPieces).mockResolvedValue({
      data: mockPieces,
      total: 2,
    } as any)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=tenant-1')
    const response = await getPieces(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pieces).toEqual(mockPieces)
    expect(data.total).toBe(2)
    expect(tenants.getTenantById).toHaveBeenCalledWith('tenant-1')
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/pieces')
    const response = await getPieces(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })

  it('should return 404 if tenant not found', async () => {
    vi.mocked(tenants.getTenantById).mockResolvedValue(null)
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=invalid')
    const response = await getPieces(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Tenant not found')
  })

  it('should search pieces with query', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResults = [{ id: 'piece-1', name: 'Searched Piece' }]

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.searchPieces).mockResolvedValue(mockResults as any)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=tenant-1&q=test')
    const response = await getPieces(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pieces).toEqual(mockResults)
    expect(data.query).toBe('test')
    expect(pieces.searchPieces).toHaveBeenCalledWith('tenant-1', 'test', expect.any(Object))
  })

  it('should filter by category', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.listPieces).mockResolvedValue({ data: [], total: 0 } as any)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=tenant-1&category=jewelry')
    const response = await getPieces(request)

    expect(response.status).toBe(200)
    expect(pieces.listPieces).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      category: 'jewelry',
    }))
  })

  it('should respect limit parameter', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.listPieces).mockResolvedValue({ data: [], total: 0 } as any)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=tenant-1&limit=10')
    const response = await getPieces(request)

    expect(response.status).toBe(200)
    expect(pieces.listPieces).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      limit: 10,
    }))
  })

  it('should clamp limit to max 100', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.listPieces).mockResolvedValue({ data: [], total: 0 } as any)

    const request = new NextRequest('http://localhost/api/pieces?tenantId=tenant-1&limit=200')
    const response = await getPieces(request)

    expect(response.status).toBe(200)
    expect(pieces.listPieces).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      limit: 100,
    }))
  })
})

describe('Public API - Collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return collections with tenantId', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockCollections = [
      { id: 'col-1', name: 'Collection 1' },
      { id: 'col-2', name: 'Collection 2' },
    ]

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    // Mock collections repository
    const collections = await import('@madebuy/db').then(m => m.collections)
    vi.spyOn(collections, 'listPublishedCollections').mockResolvedValue(mockCollections as any)

    const request = new NextRequest('http://localhost/api/collections?tenantId=tenant-1')
    const response = await getCollections(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.collections).toEqual(mockCollections)
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/collections')
    const response = await getCollections(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })

  it('should return featured collections', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockFeatured = [{ id: 'col-1', name: 'Featured Collection' }]

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    const collections = await import('@madebuy/db').then(m => m.collections)
    vi.spyOn(collections, 'getFeaturedCollections').mockResolvedValue(mockFeatured as any)

    const request = new NextRequest('http://localhost/api/collections?tenantId=tenant-1&featured=true')
    const response = await getCollections(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.collections).toEqual(mockFeatured)
  })
})

describe('Public API - Bundles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return bundles with valid tenantId', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockBundles = [{ id: 'bundle-1', name: 'Test Bundle' }]

    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
    const bundles = await import('@madebuy/db').then(m => m.bundles)
    vi.spyOn(bundles, 'listActiveBundles').mockResolvedValue(mockBundles as any)
    vi.spyOn(bundles, 'getBundleWithPieces').mockResolvedValue(mockBundles[0] as any)

    const request = new NextRequest('http://localhost/api/bundles?tenantId=tenant-1')
    const response = await getBundles(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bundles).toHaveLength(1)
  })

  it('should return 400 if tenantId is missing', async () => {
    const request = new NextRequest('http://localhost/api/bundles')
    const response = await getBundles(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('tenantId is required')
  })

  it('should return 400 for invalid tenantId format', async () => {
    const request = new NextRequest('http://localhost/api/bundles?tenantId=../invalid')
    const response = await getBundles(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid tenantId format')
  })

  it('should validate limit parameter', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)

    const request = new NextRequest('http://localhost/api/bundles?tenantId=tenant-1&limit=200')
    const response = await getBundles(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid limit')
  })
})

describe('Public API - Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should search products with query', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    const mockResults = [
      { id: 'piece-1', name: 'Test Piece', price: 50, currency: 'AUD' },
    ]

    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.searchPieces).mockResolvedValue(mockResults as any)

    const request = new NextRequest('http://localhost/api/search?q=test&tenant=test-tenant')
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].name).toBe('Test Piece')
  })

  it('should return 400 if query is missing', async () => {
    const request = new NextRequest('http://localhost/api/search?tenant=test-tenant')
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required parameters')
  })

  it('should return 400 if tenant is missing', async () => {
    const request = new NextRequest('http://localhost/api/search?q=test')
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required parameters')
  })

  it('should return 404 if tenant not found', async () => {
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/search?q=test&tenant=invalid')
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Tenant not found')
  })

  it('should return empty results for empty query', async () => {
    const request = new NextRequest('http://localhost/api/search?q=&tenant=test-tenant')
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toEqual([])
  })

  it('should return 400 if query is too long', async () => {
    const longQuery = 'a'.repeat(201)
    const request = new NextRequest(`http://localhost/api/search?q=${longQuery}&tenant=test-tenant`)
    const response = await getSearch(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Query too long')
  })

  it('should respect limit parameter', async () => {
    const mockTenant = { id: 'tenant-1', slug: 'test-tenant' }
    vi.mocked(tenants.getTenantBySlug).mockResolvedValue(mockTenant as any)
    vi.mocked(pieces.searchPieces).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/search?q=test&tenant=test-tenant&limit=10')
    const response = await getSearch(request)

    expect(response.status).toBe(200)
    expect(pieces.searchPieces).toHaveBeenCalledWith('tenant-1', 'test', expect.objectContaining({
      limit: 10,
    }))
  })
})
