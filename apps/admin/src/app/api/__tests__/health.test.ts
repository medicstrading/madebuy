import { getDatabase } from '@madebuy/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequest } from '../../../__tests__/setup'

// Mock @madebuy/db getDatabase
vi.mock('@madebuy/db', async () => {
  const actual = await vi.importActual('@madebuy/db')
  return {
    ...actual,
    getDatabase: vi.fn(),
  }
})

// Import handler AFTER mocks
import { GET } from '../health/route'

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('returns 200 with healthy status when database is accessible', async () => {
      const mockDb = {
        command: vi.fn().mockResolvedValue({ ok: 1 }),
      }
      vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

      const req = createRequest('/api/health')
      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        status: 'healthy',
        service: 'madebuy-admin',
      })
      expect(data.timestamp).toBeDefined()
      expect(mockDb.command).toHaveBeenCalledWith({ ping: 1 })
    })

    it('returns 503 with unhealthy status when database is not accessible', async () => {
      const dbError = new Error('Connection refused')
      vi.mocked(getDatabase).mockRejectedValue(dbError)

      const req = createRequest('/api/health')
      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(503)
      expect(data).toMatchObject({
        status: 'unhealthy',
        service: 'madebuy-admin',
        error: 'Connection refused',
      })
      expect(data.timestamp).toBeDefined()
    })

    it('returns 503 when database ping fails', async () => {
      const mockDb = {
        command: vi.fn().mockRejectedValue(new Error('Database timeout')),
      }
      vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

      const req = createRequest('/api/health')
      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(503)
      expect(data).toMatchObject({
        status: 'unhealthy',
        service: 'madebuy-admin',
        error: 'Database timeout',
      })
    })
  })
})
