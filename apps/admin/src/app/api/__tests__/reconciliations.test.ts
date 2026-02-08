import { reconciliations } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
} from '../../../__tests__/setup'

const mockGetCurrentTenant = vi.fn()

vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Import handlers AFTER mocks
import {
  GET as listReconciliations,
  POST as createReconciliation,
} from '../reconciliations/route'
import {
  DELETE as deleteReconciliation,
  GET as getReconciliation,
} from '../reconciliations/[id]/route'
import { POST as completeReconciliation } from '../reconciliations/[id]/complete/route'
import { POST as cancelReconciliation } from '../reconciliations/[id]/cancel/route'
import { POST as addReconciliationItem } from '../reconciliations/[id]/items/route'

describe('Reconciliations API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/reconciliations', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations')
      const res = await listReconciliations(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('lists reconciliations successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const mockResult = {
        reconciliations: [
          { id: '1', status: 'in_progress', createdAt: new Date() },
          { id: '2', status: 'completed', createdAt: new Date() },
        ],
        total: 2,
      }
      vi.mocked(reconciliations.listReconciliations).mockResolvedValue(mockResult)

      const req = createRequest('/api/reconciliations')
      const res = await listReconciliations(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        reconciliations: [
          { id: '1', status: 'in_progress', createdAt: expect.any(String) },
          { id: '2', status: 'completed', createdAt: expect.any(String) },
        ],
        total: 2,
      })
      expect(reconciliations.listReconciliations).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        status: undefined,
        limit: 20,
        offset: 0,
      })
    })

    it('filters by status', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.listReconciliations).mockResolvedValue({
        reconciliations: [],
        total: 0,
      })

      const req = createRequest('/api/reconciliations?status=in_progress&limit=10&offset=5')
      const res = await listReconciliations(req)

      expect(res.status).toBe(200)
      expect(reconciliations.listReconciliations).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        status: 'in_progress',
        limit: 10,
        offset: 5,
      })
    })
  })

  describe('POST /api/reconciliations', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations', {
        method: 'POST',
        body: { name: 'Stock Check' },
      })
      const res = await createReconciliation(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('creates reconciliation successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const mockReconciliation = {
        id: '1',
        name: 'Monthly Stock Check',
        status: 'in_progress',
        createdAt: new Date(),
      }
      vi.mocked(reconciliations.createReconciliation).mockResolvedValue(mockReconciliation)

      const req = createRequest('/api/reconciliations', {
        method: 'POST',
        body: { name: 'Monthly Stock Check' },
      })
      const res = await createReconciliation(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({
        reconciliation: {
          id: '1',
          name: 'Monthly Stock Check',
          status: 'in_progress',
          createdAt: expect.any(String),
        },
      })
      expect(reconciliations.createReconciliation).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        name: 'Monthly Stock Check',
      })
    })
  })

  describe('GET /api/reconciliations/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/1')
      const res = await getReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when reconciliation not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.getReconciliation).mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/999')
      const res = await getReconciliation(req, {
        params: Promise.resolve({ id: '999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Reconciliation not found' })
    })

    it('gets reconciliation successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const mockReconciliation = {
        id: '1',
        name: 'Monthly Check',
        status: 'in_progress',
      }
      vi.mocked(reconciliations.getReconciliation).mockResolvedValue(mockReconciliation)

      const req = createRequest('/api/reconciliations/1')
      const res = await getReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ reconciliation: mockReconciliation })
    })
  })

  describe('DELETE /api/reconciliations/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/1', { method: 'DELETE' })
      const res = await deleteReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when reconciliation not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.deleteReconciliation).mockRejectedValue(
        new Error('Reconciliation not found'),
      )

      const req = createRequest('/api/reconciliations/999', { method: 'DELETE' })
      const res = await deleteReconciliation(req, {
        params: Promise.resolve({ id: '999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 when trying to delete completed reconciliation', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.deleteReconciliation).mockRejectedValue(
        new Error('Cannot delete completed reconciliation'),
      )

      const req = createRequest('/api/reconciliations/1', { method: 'DELETE' })
      const res = await deleteReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Cannot delete')
    })

    it('deletes reconciliation successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.deleteReconciliation).mockResolvedValue(undefined)

      const req = createRequest('/api/reconciliations/1', { method: 'DELETE' })
      const res = await deleteReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })

  describe('POST /api/reconciliations/[id]/complete', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/1/complete', { method: 'POST' })
      const res = await completeReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when reconciliation not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.completeReconciliation).mockRejectedValue(
        new Error('Reconciliation not found'),
      )

      const req = createRequest('/api/reconciliations/999/complete', { method: 'POST' })
      const res = await completeReconciliation(req, {
        params: Promise.resolve({ id: '999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 when reconciliation is not in progress', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.completeReconciliation).mockRejectedValue(
        new Error('Reconciliation not in progress'),
      )

      const req = createRequest('/api/reconciliations/1/complete', { method: 'POST' })
      const res = await completeReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('not in progress')
    })

    it('completes reconciliation successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const mockReconciliation = {
        id: '1',
        status: 'completed',
        completedAt: new Date(),
      }
      vi.mocked(reconciliations.completeReconciliation).mockResolvedValue(undefined)
      vi.mocked(reconciliations.getReconciliation).mockResolvedValue(mockReconciliation)

      const req = createRequest('/api/reconciliations/1/complete', { method: 'POST' })
      const res = await completeReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        reconciliation: {
          id: '1',
          status: 'completed',
          completedAt: expect.any(String),
        },
        message: 'Stock levels have been updated',
      })
    })
  })

  describe('POST /api/reconciliations/[id]/cancel', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/1/cancel', { method: 'POST' })
      const res = await cancelReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when reconciliation not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.cancelReconciliation).mockRejectedValue(
        new Error('Reconciliation not found'),
      )

      const req = createRequest('/api/reconciliations/999/cancel', { method: 'POST' })
      const res = await cancelReconciliation(req, {
        params: Promise.resolve({ id: '999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('cancels reconciliation successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.cancelReconciliation).mockResolvedValue(undefined)

      const req = createRequest('/api/reconciliations/1/cancel', { method: 'POST' })
      const res = await cancelReconciliation(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Reconciliation cancelled. No stock changes applied.',
      })
    })
  })

  describe('POST /api/reconciliations/[id]/items', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const req = createRequest('/api/reconciliations/1/items', {
        method: 'POST',
        body: { itemType: 'material', itemId: 'mat-1', actualQuantity: 10 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when itemType is missing', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const req = createRequest('/api/reconciliations/1/items', {
        method: 'POST',
        body: { itemId: 'mat-1', actualQuantity: 10 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'itemType and itemId are required' })
    })

    it('returns 400 when itemType is invalid', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const req = createRequest('/api/reconciliations/1/items', {
        method: 'POST',
        body: { itemType: 'invalid', itemId: 'mat-1', actualQuantity: 10 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'itemType must be "material" or "piece"' })
    })

    it('returns 404 when reconciliation not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.addItem).mockRejectedValue(
        new Error('Reconciliation not found'),
      )

      const req = createRequest('/api/reconciliations/999/items', {
        method: 'POST',
        body: { itemType: 'material', itemId: 'mat-1', actualQuantity: 10 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '999' }),
      })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('returns 400 when item already added', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)
      vi.mocked(reconciliations.addItem).mockRejectedValue(
        new Error('Item already added to reconciliation'),
      )

      const req = createRequest('/api/reconciliations/1/items', {
        method: 'POST',
        body: { itemType: 'material', itemId: 'mat-1', actualQuantity: 10 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('already added')
    })

    it('adds reconciliation item successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(MOCK_TENANT_FREE)

      const mockItem = {
        itemType: 'material',
        itemId: 'mat-1',
        expectedQuantity: 20,
        actualQuantity: 18,
        discrepancy: -2,
      }
      vi.mocked(reconciliations.addItem).mockResolvedValue(mockItem)

      const req = createRequest('/api/reconciliations/1/items', {
        method: 'POST',
        body: { itemType: 'material', itemId: 'mat-1', actualQuantity: 18 },
      })
      const res = await addReconciliationItem(req, {
        params: Promise.resolve({ id: '1' }),
      })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({ item: mockItem })
    })
  })
})
