import { collections } from '@madebuy/db'
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
import {
  GET as listCollections,
  POST as createCollection,
} from '../collections/route'
import {
  GET as getCollection,
  PATCH as updateCollection,
  DELETE as deleteCollection,
} from '../collections/[id]/route'
import {
  POST as addPieceToCollection,
  DELETE as removePieceFromCollection,
} from '../collections/[id]/pieces/route'

describe('GET /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections')

    const response = await listCollections(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns collections list', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.listCollections).mockResolvedValue({
      collections: [
        {
          id: 'coll-1',
          tenantId: 'tenant-123',
          name: 'Summer Collection',
          slug: 'summer-collection',
          pieceIds: ['piece-1', 'piece-2'],
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    })

    const request = createRequest('/api/collections')

    const response = await listCollections(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      collections: [{ id: 'coll-1', name: 'Summer Collection' }],
      total: 1,
    })
    expect(collections.listCollections).toHaveBeenCalledWith('tenant-123', {})
  })

  it('filters collections by parameters', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.listCollections).mockResolvedValue({
      collections: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    })

    const request = createRequest(
      '/api/collections?isPublished=true&isFeatured=true&limit=10&offset=5&sortBy=name&sortOrder=asc',
    )

    await listCollections(request)

    expect(collections.listCollections).toHaveBeenCalledWith('tenant-123', {
      isPublished: true,
      isFeatured: true,
      limit: 10,
      offset: 5,
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })
})

describe('POST /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections', {
      method: 'POST',
      body: { name: 'New Collection' },
    })

    const response = await createCollection(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when name is missing', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/collections', {
      method: 'POST',
      body: {},
    })

    const response = await createCollection(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'Name is required',
    })
  })

  it('creates collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const newCollection = {
      id: 'coll-new',
      tenantId: 'tenant-123',
      name: 'New Collection',
      slug: 'new-collection',
      pieceIds: [],
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(collections.createCollection).mockResolvedValue(newCollection)

    const request = createRequest('/api/collections', {
      method: 'POST',
      body: {
        name: 'New Collection',
        description: 'A new collection',
        isPublished: true,
      },
    })

    const response = await createCollection(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      collection: { id: 'coll-new', name: 'New Collection' },
    })
    expect(collections.createCollection).toHaveBeenCalledWith('tenant-123', {
      name: 'New Collection',
      description: 'A new collection',
      isPublished: true,
    })
  })
})

describe('GET /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-1')

    const response = await getCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when collection not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.getCollectionById).mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-999')

    const response = await getCollection(request, { params: { id: 'coll-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Collection not found',
    })
  })

  it('returns collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.getCollectionById).mockResolvedValue({
      id: 'coll-1',
      tenantId: 'tenant-123',
      name: 'Summer Collection',
      slug: 'summer-collection',
      pieceIds: ['piece-1'],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const request = createRequest('/api/collections/coll-1')

    const response = await getCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      collection: { id: 'coll-1', name: 'Summer Collection' },
    })
    expect(collections.getCollectionById).toHaveBeenCalledWith('tenant-123', 'coll-1')
  })
})

describe('PATCH /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    })

    const response = await updateCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when collection not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.updateCollection).mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-999', {
      method: 'PATCH',
      body: { name: 'Updated' },
    })

    const response = await updateCollection(request, { params: { id: 'coll-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Collection not found',
    })
  })

  it('updates collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const updatedCollection = {
      id: 'coll-1',
      tenantId: 'tenant-123',
      name: 'Updated Collection',
      slug: 'updated-collection',
      pieceIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(collections.updateCollection).mockResolvedValue(updatedCollection)

    const request = createRequest('/api/collections/coll-1', {
      method: 'PATCH',
      body: { name: 'Updated Collection', isPublished: true },
    })

    const response = await updateCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      collection: { id: 'coll-1', name: 'Updated Collection' },
    })
    expect(collections.updateCollection).toHaveBeenCalledWith('tenant-123', 'coll-1', {
      name: 'Updated Collection',
      isPublished: true,
    })
  })
})

describe('DELETE /api/collections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-1', { method: 'DELETE' })

    const response = await deleteCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 404 when collection not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.deleteCollection).mockResolvedValue(false)
    const request = createRequest('/api/collections/coll-999', { method: 'DELETE' })

    const response = await deleteCollection(request, { params: { id: 'coll-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Collection not found',
    })
  })

  it('deletes collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.deleteCollection).mockResolvedValue(true)

    const request = createRequest('/api/collections/coll-1', { method: 'DELETE' })

    const response = await deleteCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
    })
    expect(collections.deleteCollection).toHaveBeenCalledWith('tenant-123', 'coll-1')
  })
})

describe('POST /api/collections/[id]/pieces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-1/pieces', {
      method: 'POST',
      body: { pieceId: 'piece-1' },
    })

    const response = await addPieceToCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when pieceId is missing', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/collections/coll-1/pieces', {
      method: 'POST',
      body: {},
    })

    const response = await addPieceToCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'pieceId is required',
    })
  })

  it('returns 404 when collection not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.addPieceToCollection).mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-999/pieces', {
      method: 'POST',
      body: { pieceId: 'piece-1' },
    })

    const response = await addPieceToCollection(request, {
      params: { id: 'coll-999' },
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Collection not found',
    })
  })

  it('adds piece to collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const updatedCollection = {
      id: 'coll-1',
      tenantId: 'tenant-123',
      name: 'Summer Collection',
      slug: 'summer-collection',
      pieceIds: ['piece-1'],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(collections.addPieceToCollection).mockResolvedValue(updatedCollection)

    const request = createRequest('/api/collections/coll-1/pieces', {
      method: 'POST',
      body: { pieceId: 'piece-1' },
    })

    const response = await addPieceToCollection(request, { params: { id: 'coll-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      collection: { id: 'coll-1', pieceIds: ['piece-1'] },
    })
    expect(collections.addPieceToCollection).toHaveBeenCalledWith(
      'tenant-123',
      'coll-1',
      'piece-1',
    )
  })
})

describe('DELETE /api/collections/[id]/pieces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/collections/coll-1/pieces?pieceId=piece-1', {
      method: 'DELETE',
    })

    const response = await removePieceFromCollection(request, {
      params: { id: 'coll-1' },
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when pieceId query param is missing', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/collections/coll-1/pieces', {
      method: 'DELETE',
    })

    const response = await removePieceFromCollection(request, {
      params: { id: 'coll-1' },
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'pieceId query parameter is required',
    })
  })

  it('returns 404 when collection not found', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(collections.removePieceFromCollection).mockResolvedValue(null)
    const request = createRequest(
      '/api/collections/coll-999/pieces?pieceId=piece-1',
      { method: 'DELETE' },
    )

    const response = await removePieceFromCollection(request, {
      params: { id: 'coll-999' },
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Collection not found',
    })
  })

  it('removes piece from collection successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const updatedCollection = {
      id: 'coll-1',
      tenantId: 'tenant-123',
      name: 'Summer Collection',
      slug: 'summer-collection',
      pieceIds: [],
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(collections.removePieceFromCollection).mockResolvedValue(
      updatedCollection,
    )

    const request = createRequest('/api/collections/coll-1/pieces?pieceId=piece-1', {
      method: 'DELETE',
    })

    const response = await removePieceFromCollection(request, {
      params: { id: 'coll-1' },
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      collection: { id: 'coll-1', pieceIds: [] },
    })
    expect(collections.removePieceFromCollection).toHaveBeenCalledWith(
      'tenant-123',
      'coll-1',
      'piece-1',
    )
  })
})
