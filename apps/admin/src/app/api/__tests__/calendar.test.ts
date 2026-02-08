import { keyDates } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Import handlers AFTER setup (which already mocks @/lib/session)
import { GET as listKeyDates, POST as createKeyDate } from '../calendar/key-dates/route'
import {
  DELETE as deleteKeyDate,
  GET as getKeyDate,
  PATCH as updateKeyDate,
} from '../calendar/key-dates/[id]/route'

describe('Calendar API - Key Dates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/calendar/key-dates', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/calendar/key-dates')
      const res = await listKeyDates(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('lists key dates successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockKeyDates = [
        { id: '1', title: 'Market Day', date: new Date('2026-03-15') },
        { id: '2', title: 'Holiday Sale', date: new Date('2026-12-20') },
      ]
      vi.mocked(keyDates.listKeyDates).mockResolvedValue(mockKeyDates)

      const req = createRequest('/api/calendar/key-dates')
      const res = await listKeyDates(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        keyDates: [
          { id: '1', title: 'Market Day', date: '2026-03-15T00:00:00.000Z' },
          { id: '2', title: 'Holiday Sale', date: '2026-12-20T00:00:00.000Z' },
        ],
      })
      expect(keyDates.listKeyDates).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {})
    })

    it('passes query parameters to repository', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(keyDates.listKeyDates).mockResolvedValue([])

      const req = createRequest(
        '/api/calendar/key-dates?startDate=2026-01-01&endDate=2026-12-31&limit=10&offset=0&sortBy=date&sortOrder=asc',
      )
      const res = await listKeyDates(req)

      expect(res.status).toBe(200)
      expect(keyDates.listKeyDates).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        limit: 10,
        offset: 0,
        sortBy: 'date',
        sortOrder: 'asc',
      })
    })
  })

  describe('POST /api/calendar/key-dates', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/calendar/key-dates', {
        method: 'POST',
        body: { title: 'Event', date: '2026-05-01' },
      })
      const res = await createKeyDate(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when title is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/calendar/key-dates', {
        method: 'POST',
        body: { date: '2026-05-01' },
      })
      const res = await createKeyDate(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Title and date are required' })
    })

    it('returns 400 when date is missing', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/calendar/key-dates', {
        method: 'POST',
        body: { title: 'Event' },
      })
      const res = await createKeyDate(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Title and date are required' })
    })

    it('creates key date successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockKeyDate = {
        id: '1',
        title: 'Market Day',
        date: new Date('2026-05-01'),
        tenantId: MOCK_TENANT_FREE.id,
      }
      vi.mocked(keyDates.createKeyDate).mockResolvedValue(mockKeyDate)

      const req = createRequest('/api/calendar/key-dates', {
        method: 'POST',
        body: { title: 'Market Day', date: '2026-05-01', notes: 'Bring tent' },
      })
      const res = await createKeyDate(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({
        keyDate: {
          id: '1',
          title: 'Market Day',
          date: '2026-05-01T00:00:00.000Z',
          tenantId: MOCK_TENANT_FREE.id,
        },
      })
      expect(keyDates.createKeyDate).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, {
        title: 'Market Day',
        date: '2026-05-01',
        notes: 'Bring tent',
      })
    })
  })

  describe('GET /api/calendar/key-dates/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/calendar/key-dates/1')
      const res = await getKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when key date not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(keyDates.getKeyDateById).mockResolvedValue(null)

      const req = createRequest('/api/calendar/key-dates/999')
      const res = await getKeyDate(req, { params: { id: '999' } })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Key date not found' })
    })

    it('gets key date successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockKeyDate = {
        id: '1',
        title: 'Market Day',
        date: new Date('2026-05-01'),
      }
      vi.mocked(keyDates.getKeyDateById).mockResolvedValue(mockKeyDate)

      const req = createRequest('/api/calendar/key-dates/1')
      const res = await getKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        keyDate: {
          id: '1',
          title: 'Market Day',
          date: '2026-05-01T00:00:00.000Z',
        },
      })
      expect(keyDates.getKeyDateById).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, '1')
    })
  })

  describe('PATCH /api/calendar/key-dates/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/calendar/key-dates/1', {
        method: 'PATCH',
        body: { title: 'Updated' },
      })
      const res = await updateKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when key date not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(keyDates.updateKeyDate).mockResolvedValue(null)

      const req = createRequest('/api/calendar/key-dates/999', {
        method: 'PATCH',
        body: { title: 'Updated' },
      })
      const res = await updateKeyDate(req, { params: { id: '999' } })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Key date not found' })
    })

    it('updates key date successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockKeyDate = {
        id: '1',
        title: 'Updated Event',
        date: new Date('2026-06-01'),
      }
      vi.mocked(keyDates.updateKeyDate).mockResolvedValue(mockKeyDate)

      const req = createRequest('/api/calendar/key-dates/1', {
        method: 'PATCH',
        body: { title: 'Updated Event', date: '2026-06-01' },
      })
      const res = await updateKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        keyDate: {
          id: '1',
          title: 'Updated Event',
          date: '2026-06-01T00:00:00.000Z',
        },
      })
      expect(keyDates.updateKeyDate).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, '1', {
        title: 'Updated Event',
        date: '2026-06-01',
      })
    })
  })

  describe('DELETE /api/calendar/key-dates/[id]', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/calendar/key-dates/1', { method: 'DELETE' })
      const res = await deleteKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when key date not found', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(keyDates.deleteKeyDate).mockResolvedValue(false)

      const req = createRequest('/api/calendar/key-dates/999', { method: 'DELETE' })
      const res = await deleteKeyDate(req, { params: { id: '999' } })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Key date not found' })
    })

    it('deletes key date successfully', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(keyDates.deleteKeyDate).mockResolvedValue(true)

      const req = createRequest('/api/calendar/key-dates/1', { method: 'DELETE' })
      const res = await deleteKeyDate(req, { params: { id: '1' } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(keyDates.deleteKeyDate).toHaveBeenCalledWith(MOCK_TENANT_FREE.id, '1')
    })
  })
})
