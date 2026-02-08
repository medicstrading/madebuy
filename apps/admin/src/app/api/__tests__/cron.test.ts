import { publish, tenants } from '@madebuy/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequest } from '../../../__tests__/setup'

const mockExecutePublishRecord = vi.fn()
vi.mock('@/lib/publish-execute', () => ({
  executePublishRecord: (...args: any[]) => mockExecutePublishRecord(...args),
}))

// Import handlers AFTER mocks
import { GET as resetUsage, POST as resetUsagePost } from '../cron/reset-usage/route'
import { GET as cronPublish, POST as cronPublishPost } from '../cron/publish/route'
import {
  GET as abandonedCart,
  POST as abandonedCartPost,
} from '../cron/abandoned-cart/route'

describe('Cron API - Reset Usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  })

  describe('GET /api/cron/reset-usage', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      vi.stubEnv('CRON_SECRET', '')

      const req = createRequest('/api/cron/reset-usage', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await resetUsage(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Server configuration error' })
    })

    it('returns 401 when authorization header is missing', async () => {
      const req = createRequest('/api/cron/reset-usage')
      const res = await resetUsage(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 401 when authorization secret is incorrect', async () => {
      const req = createRequest('/api/cron/reset-usage', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
      const res = await resetUsage(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns success when no tenants need reset', async () => {
      vi.mocked(tenants.getTenantsNeedingUsageReset).mockResolvedValue([])

      const req = createRequest('/api/cron/reset-usage', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await resetUsage(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        success: true,
        processed: 0,
        message: 'No tenants need usage reset',
      })
    })

    it('resets usage for tenants successfully', async () => {
      vi.mocked(tenants.getTenantsNeedingUsageReset).mockResolvedValue([
        { id: 't1', email: 'test1@example.com' },
        { id: 't2', email: 'test2@example.com' },
      ] as any)
      vi.mocked(tenants.resetMonthlyUsage).mockResolvedValue(undefined)

      const req = createRequest('/api/cron/reset-usage', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await resetUsage(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        processed: 2,
        succeeded: 2,
        failed: 0,
      })
      expect(tenants.resetMonthlyUsage).toHaveBeenCalledTimes(2)
    })

    it('POST works the same as GET', async () => {
      vi.mocked(tenants.getTenantsNeedingUsageReset).mockResolvedValue([])

      const req = createRequest('/api/cron/reset-usage', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await resetUsagePost(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})

describe('Cron API - Publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  })

  describe('GET /api/cron/publish', () => {
    it('returns 401 when unauthorized', async () => {
      const req = createRequest('/api/cron/publish')
      const res = await cronPublish(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns success when no posts are scheduled', async () => {
      // Mock getDatabase to return empty results
      const { getDatabase } = await import('@madebuy/db')
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            project: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
            sort: vi.fn().mockReturnValue({
              project: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }
      vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

      const req = createRequest('/api/cron/publish', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await cronPublish(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        processed: 0,
        message: 'No scheduled posts ready to publish',
      })
    })

    it('POST works the same as GET', async () => {
      const { getDatabase } = await import('@madebuy/db')
      const mockDb = {
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            project: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
            sort: vi.fn().mockReturnValue({
              project: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }
      vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

      const req = createRequest('/api/cron/publish', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await cronPublishPost(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})

describe('Cron API - Abandoned Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret')
  })

  describe('GET /api/cron/abandoned-cart', () => {
    it('returns 401 when unauthorized', async () => {
      const req = createRequest('/api/cron/abandoned-cart')
      const res = await abandonedCart(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 500 when UNSUBSCRIBE_SECRET is not configured', async () => {
      vi.stubEnv('UNSUBSCRIBE_SECRET', '')

      const req = createRequest('/api/cron/abandoned-cart', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await abandonedCart(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data).toEqual({ error: 'Server configuration error' })
    })

    it('returns success when no carts are abandoned', async () => {
      vi.mocked(tenants.listTenants).mockResolvedValue([])

      const req = createRequest('/api/cron/abandoned-cart', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await abandonedCart(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      })
    })

    it('POST works the same as GET', async () => {
      vi.mocked(tenants.listTenants).mockResolvedValue([])

      const req = createRequest('/api/cron/abandoned-cart', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      })
      const res = await abandonedCartPost(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
