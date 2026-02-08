import { workshops } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Import handlers AFTER setup (which already mocks @/lib/session)
import { GET as listWorkshops, POST as createWorkshop } from '../workshops/route'
import {
  DELETE as deleteWorkshop,
  GET as getWorkshop,
  PUT as updateWorkshop,
} from '../workshops/[id]/route'
import { GET as getSlots, POST as createSlot } from '../workshops/[id]/slots/route'

describe('Workshops API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/workshops', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops')
      const res = await listWorkshops(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('lists workshops successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockResult = {
        workshops: [
          { id: '1', name: 'Pottery Basics', price: 5000 },
          { id: '2', name: 'Advanced Glazing', price: 8000 },
        ],
        total: 2,
      }
      vi.mocked(workshops.listWorkshops).mockResolvedValue(mockResult)

      const req = createRequest('/api/workshops')
      const res = await listWorkshops(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockResult)
      expect(workshops.listWorkshops).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {})
    })

    it('passes query filters to repository', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(workshops.listWorkshops).mockResolvedValue({ workshops: [], total: 0 })

      const req = createRequest(
        '/api/workshops?status=active&category=pottery&locationType=in-person&skillLevel=beginner&search=clay&limit=10&offset=0',
      )
      const res = await listWorkshops(req)

      expect(res.status).toBe(200)
      expect(workshops.listWorkshops).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        status: 'active',
        category: 'pottery',
        locationType: 'in-person',
        skillLevel: 'beginner',
        search: 'clay',
        limit: 10,
        offset: 0,
      })
    })
  })

  describe('POST /api/workshops', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: { name: 'Test', description: 'Test', price: 5000 },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when name is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: { description: 'Test', price: 5000 },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Name is required' })
    })

    it('returns 400 when description is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: { name: 'Test', price: 5000 },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Description is required' })
    })

    it('returns 400 when price is invalid', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: { name: 'Test', description: 'Test', price: -100 },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Valid price is required' })
    })

    it('returns 400 when durationMinutes is invalid', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: {
          name: 'Test',
          description: 'Test',
          price: 5000,
          durationMinutes: 0,
          capacity: 10,
          locationType: 'in-person',
        },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Duration must be at least 1 minute' })
    })

    it('returns 400 when capacity is invalid', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: {
          name: 'Test',
          description: 'Test',
          price: 5000,
          durationMinutes: 120,
          capacity: 0,
          locationType: 'in-person',
        },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Capacity must be at least 1' })
    })

    it('returns 400 when locationType is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: {
          name: 'Test',
          description: 'Test',
          price: 5000,
          durationMinutes: 120,
          capacity: 10,
        },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Location type is required' })
    })

    it('creates workshop successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockWorkshop = {
        id: '1',
        name: 'Pottery Basics',
        description: 'Learn pottery',
        price: 5000,
        durationMinutes: 120,
        capacity: 10,
        locationType: 'in-person',
      }
      vi.mocked(workshops.createWorkshop).mockResolvedValue(mockWorkshop)

      const req = createRequest('/api/workshops', {
        method: 'POST',
        body: {
          name: 'Pottery Basics',
          description: 'Learn pottery',
          price: 5000,
          durationMinutes: 120,
          capacity: 10,
          locationType: 'in-person',
        },
      })
      const res = await createWorkshop(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({ workshop: mockWorkshop })
    })
  })

  describe('GET /api/workshops/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops/1')
      const res = await getWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when workshop not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(workshops.getWorkshopById).mockResolvedValue(null)

      const req = createRequest('/api/workshops/999')
      const res = await getWorkshop(req, { params: Promise.resolve({ id: '999' }) })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Workshop not found' })
    })

    it('gets workshop successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockWorkshop = { id: '1', name: 'Pottery Basics', price: 5000 }
      vi.mocked(workshops.getWorkshopById).mockResolvedValue(mockWorkshop)

      const req = createRequest('/api/workshops/1')
      const res = await getWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ workshop: mockWorkshop })
    })
  })

  describe('PUT /api/workshops/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops/1', {
        method: 'PUT',
        body: { name: 'Updated' },
      })
      const res = await updateWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when price is negative', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops/1', {
        method: 'PUT',
        body: { price: -100 },
      })
      const res = await updateWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Price must be non-negative' })
    })

    it('returns 404 when workshop not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(workshops.updateWorkshop).mockResolvedValue(null)

      const req = createRequest('/api/workshops/999', {
        method: 'PUT',
        body: { name: 'Updated' },
      })
      const res = await updateWorkshop(req, { params: Promise.resolve({ id: '999' }) })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Workshop not found' })
    })

    it('updates workshop successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockWorkshop = { id: '1', name: 'Updated Workshop', price: 6000 }
      vi.mocked(workshops.updateWorkshop).mockResolvedValue(mockWorkshop)

      const req = createRequest('/api/workshops/1', {
        method: 'PUT',
        body: { name: 'Updated Workshop', price: 6000 },
      })
      const res = await updateWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ workshop: mockWorkshop })
    })
  })

  describe('DELETE /api/workshops/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops/1', { method: 'DELETE' })
      const res = await deleteWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when workshop not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(workshops.deleteWorkshop).mockResolvedValue(false)

      const req = createRequest('/api/workshops/999', { method: 'DELETE' })
      const res = await deleteWorkshop(req, { params: Promise.resolve({ id: '999' }) })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Workshop not found' })
    })

    it('deletes workshop successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(workshops.deleteWorkshop).mockResolvedValue(true)

      const req = createRequest('/api/workshops/1', { method: 'DELETE' })
      const res = await deleteWorkshop(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })

  describe('GET /api/workshops/[id]/slots', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops/1/slots')
      const res = await getSlots(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('gets workshop slots successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockSlots = [
        { id: 's1', startTime: new Date('2026-03-01T10:00:00Z'), endTime: new Date('2026-03-01T12:00:00Z') },
        { id: 's2', startTime: new Date('2026-03-02T10:00:00Z'), endTime: new Date('2026-03-02T12:00:00Z') },
      ]
      vi.mocked(workshops.getAvailableSlots).mockResolvedValue(mockSlots)

      const req = createRequest('/api/workshops/1/slots')
      const res = await getSlots(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        slots: [
          { id: 's1', startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T12:00:00.000Z' },
          { id: 's2', startTime: '2026-03-02T10:00:00.000Z', endTime: '2026-03-02T12:00:00.000Z' },
        ],
      })
    })
  })

  describe('POST /api/workshops/[id]/slots', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/workshops/1/slots', {
        method: 'POST',
        body: { startTime: '2026-03-01T10:00:00Z', endTime: '2026-03-01T12:00:00Z' },
      })
      const res = await createSlot(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when startTime is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops/1/slots', {
        method: 'POST',
        body: { endTime: '2026-03-01T12:00:00Z' },
      })
      const res = await createSlot(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Start time is required' })
    })

    it('returns 400 when endTime is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops/1/slots', {
        method: 'POST',
        body: { startTime: '2026-03-01T10:00:00Z' },
      })
      const res = await createSlot(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'End time is required' })
    })

    it('returns 400 when endTime is before startTime', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/workshops/1/slots', {
        method: 'POST',
        body: { startTime: '2026-03-01T12:00:00Z', endTime: '2026-03-01T10:00:00Z' },
      })
      const res = await createSlot(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'End time must be after start time' })
    })

    it('creates slot successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockSlot = {
        id: 's1',
        workshopId: '1',
        startTime: new Date('2026-03-01T10:00:00Z'),
        endTime: new Date('2026-03-01T12:00:00Z'),
      }
      vi.mocked(workshops.createSlot).mockResolvedValue(mockSlot)

      const req = createRequest('/api/workshops/1/slots', {
        method: 'POST',
        body: { startTime: '2026-03-01T10:00:00Z', endTime: '2026-03-01T12:00:00Z' },
      })
      const res = await createSlot(req, { params: Promise.resolve({ id: '1' }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({
        slot: {
          id: 's1',
          workshopId: '1',
          startTime: '2026-03-01T10:00:00.000Z',
          endTime: '2026-03-01T12:00:00.000Z',
        },
      })
    })
  })
})
