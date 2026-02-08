import { materials } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

const mockGetCurrentTenant = vi.fn()
const mockRequireTenant = vi.fn()

vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
  requireTenant: () => mockRequireTenant(),
}))

// Import handlers AFTER mocks
import { GET as getMaterials, POST as createMaterial } from '../materials/route'
import { DELETE as deleteMaterial } from '../materials/[id]/route'
import { POST as recordUsage } from '../materials/[id]/usage/route'

describe('GET /api/materials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)

    const response = await getMaterials()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Please log in to continue.',
      code: 'UNAUTHORIZED',
    })
  })

  it('returns paginated materials list', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(materials.listMaterials).mockResolvedValue({
      materials: [
        {
          id: 'mat-1',
          tenantId: 'tenant-123',
          name: 'Beads',
          category: 'supplies',
          quantityInStock: 100,
          unit: 'pieces',
          costPerUnit: 0.5,
          lowStockThreshold: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    })

    const response = await getMaterials()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      materials: [{ id: 'mat-1', name: 'Beads' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    expect(materials.listMaterials).toHaveBeenCalledWith('tenant-123')
  })
})

describe('POST /api/materials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/materials', {
      method: 'POST',
      body: { name: 'Wire' },
    })

    const response = await createMaterial(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Please log in to continue.',
      code: 'UNAUTHORIZED',
    })
  })

  it('creates material successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const newMaterial = {
      id: 'mat-2',
      tenantId: 'tenant-123',
      name: 'Wire',
      category: 'materials' as const,
      quantityInStock: 50,
      unit: 'meters',
      costPerUnit: 2.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(materials.createMaterial).mockResolvedValue(newMaterial)

    const request = createRequest('/api/materials', {
      method: 'POST',
      body: {
        name: 'Wire',
        category: 'materials',
        quantityInStock: 50,
        unit: 'meters',
        costPerUnit: 2.5,
      },
    })

    const response = await createMaterial(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      material: { id: 'mat-2', name: 'Wire' },
    })
    expect(materials.createMaterial).toHaveBeenCalledWith('tenant-123', {
      name: 'Wire',
      category: 'materials',
      quantityInStock: 50,
      unit: 'meters',
      costPerUnit: 2.5,
    })
  })

  it('sanitizes text inputs', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(materials.createMaterial).mockResolvedValue({
      id: 'mat-3',
      tenantId: 'tenant-123',
      name: 'Clean Name',
      category: 'supplies' as const,
      quantityInStock: 10,
      unit: 'pieces',
      costPerUnit: 1.0,
      supplier: 'Clean Supplier',
      notes: 'Clean Notes',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = createRequest('/api/materials', {
      method: 'POST',
      body: {
        name: 'Clean Name',
        category: 'supplies',
        quantityInStock: 10,
        unit: 'pieces',
        costPerUnit: 1.0,
        supplier: 'Clean Supplier',
        notes: 'Clean Notes',
      },
    })

    await createMaterial(request)

    // Verify sanitizeInput is called on text fields
    expect(materials.createMaterial).toHaveBeenCalledWith('tenant-123', {
      name: 'Clean Name',
      category: 'supplies',
      quantityInStock: 10,
      unit: 'pieces',
      costPerUnit: 1.0,
      supplier: 'Clean Supplier',
      notes: 'Clean Notes',
    })
  })
})

describe('DELETE /api/materials/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireTenant.mockRejectedValue(new Error('Unauthorized'))
    const request = createRequest('/api/materials/mat-1', { method: 'DELETE' })

    try {
      await deleteMaterial(request, { params: { id: 'mat-1' } })
    } catch (error: any) {
      expect(error.message).toBe('Unauthorized')
    }
  })

  it('returns 404 when material not found', async () => {
    mockRequireTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(materials.getMaterial).mockResolvedValue(null)
    const request = createRequest('/api/materials/mat-999', { method: 'DELETE' })

    const response = await deleteMaterial(request, { params: { id: 'mat-999' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toMatchObject({
      error: 'Material not found',
    })
  })

  it('deletes material successfully', async () => {
    mockRequireTenant.mockResolvedValue(MOCK_TENANT_FREE)
    vi.mocked(materials.getMaterial).mockResolvedValue({
      id: 'mat-1',
      tenantId: 'tenant-123',
      name: 'Beads',
      category: 'supplies',
      quantityInStock: 100,
      unit: 'pieces',
      costPerUnit: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(materials.deleteMaterial).mockResolvedValue(true)

    const request = createRequest('/api/materials/mat-1', { method: 'DELETE' })

    const response = await deleteMaterial(request, { params: { id: 'mat-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      success: true,
    })
    expect(materials.deleteMaterial).toHaveBeenCalledWith('tenant-123', 'mat-1')
  })
})

describe('POST /api/materials/[id]/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentTenant.mockResolvedValue(null)
    const request = createRequest('/api/materials/mat-1/usage', {
      method: 'POST',
      body: { pieceId: 'piece-1', quantityUsed: 5 },
    })

    const response = await recordUsage(request, { params: { id: 'mat-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toMatchObject({
      error: 'Unauthorized',
    })
  })

  it('returns 400 when pieceId is missing', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/materials/mat-1/usage', {
      method: 'POST',
      body: { quantityUsed: 5 },
    })

    const response = await recordUsage(request, { params: { id: 'mat-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'pieceId and quantityUsed > 0 are required',
    })
  })

  it('returns 400 when quantityUsed is invalid', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const request = createRequest('/api/materials/mat-1/usage', {
      method: 'POST',
      body: { pieceId: 'piece-1', quantityUsed: 0 },
    })

    const response = await recordUsage(request, { params: { id: 'mat-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      error: 'pieceId and quantityUsed > 0 are required',
    })
  })

  it('records material usage successfully', async () => {
    mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
    const usage = {
      id: 'usage-1',
      tenantId: 'tenant-123',
      materialId: 'mat-1',
      pieceId: 'piece-1',
      quantityUsed: 5,
      recordedAt: new Date(),
    }
    vi.mocked(materials.recordMaterialUsage).mockResolvedValue(usage)

    const request = createRequest('/api/materials/mat-1/usage', {
      method: 'POST',
      body: { pieceId: 'piece-1', quantityUsed: 5 },
    })

    const response = await recordUsage(request, { params: { id: 'mat-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      usage: { id: 'usage-1', quantityUsed: 5 },
    })
    expect(materials.recordMaterialUsage).toHaveBeenCalledWith(
      'tenant-123',
      'piece-1',
      'mat-1',
      5,
    )
  })
})
