import { tenants } from '@madebuy/db'
import { createSendleClient } from '@madebuy/shipping'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_USER,
  createRequest,
} from '../../../__tests__/setup'

const mockGetCurrentUser = vi.fn()

vi.mock('@/lib/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('@madebuy/shipping', () => ({
  createSendleClient: vi.fn(),
}))

// Import handlers AFTER mocks
import { GET as getSendle, POST as saveSendle } from '../shipping/sendle/route'
import { POST as testSendle } from '../shipping/sendle/test/route'

describe('Shipping API - Sendle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/shipping/sendle', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const req = createRequest('/api/shipping/sendle')
      const res = await getSendle()
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 404 when tenant not found', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)
      vi.mocked(tenants.getTenantById).mockResolvedValue(null)

      const req = createRequest('/api/shipping/sendle')
      const res = await getSendle()
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data).toEqual({ error: 'Tenant not found' })
    })

    it('returns Sendle settings with masked API key', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        sendleSettings: {
          apiKey: 'sk_live_1234567890abcdef',
          senderId: 'sender-123',
          isConnected: true,
          connectedAt: new Date('2026-01-01'),
          environment: 'production',
        },
        freeShippingThreshold: 5000,
      } as any)

      const res = await getSendle()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        apiKey: 'sk_l***cdef',
        senderId: 'sender-123',
        isConnected: true,
        connectedAt: expect.any(String),
        environment: 'production',
        pickupAddress: null,
        freeShippingThreshold: 5000,
      })
    })
  })

  describe('POST /api/shipping/sendle', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const req = createRequest('/api/shipping/sendle', {
        method: 'POST',
        body: { apiKey: 'sk_test_123', senderId: 'sender-123', environment: 'sandbox' },
      })
      const res = await saveSendle(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when API key and sender ID are missing', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)

      const req = createRequest('/api/shipping/sendle', {
        method: 'POST',
        body: { apiKey: '', senderId: '', environment: 'sandbox' },
      })
      const res = await saveSendle(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'API Key and Sender ID are required' })
    })

    it('returns 400 when environment is invalid', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)

      const req = createRequest('/api/shipping/sendle', {
        method: 'POST',
        body: { apiKey: 'sk_test_123', senderId: 'sender-123', environment: 'invalid' },
      })
      const res = await saveSendle(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid environment. Must be "sandbox" or "production"',
      })
    })

    it('saves Sendle settings successfully', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)
      vi.mocked(tenants.getTenantById)
        .mockResolvedValueOnce({ id: 'tenant-123' } as any)
        .mockResolvedValueOnce({
          id: 'tenant-123',
          sendleSettings: {
            apiKey: 'sk_test_1234567890abcdef',
            senderId: 'sender-123',
            environment: 'sandbox',
            isConnected: false,
          },
          freeShippingThreshold: 5000,
        } as any)
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined)

      const req = createRequest('/api/shipping/sendle', {
        method: 'POST',
        body: {
          apiKey: 'sk_test_1234567890abcdef',
          senderId: 'sender-123',
          environment: 'sandbox',
          freeShippingThreshold: 5000,
        },
      })
      const res = await saveSendle(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.apiKey).toContain('***')
      expect(data.senderId).toBe('sender-123')
      expect(tenants.updateTenant).toHaveBeenCalled()
    })
  })

  describe('POST /api/shipping/sendle/test', () => {
    it('returns 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const req = createRequest('/api/shipping/sendle/test', {
        method: 'POST',
        body: { apiKey: 'sk_test_123', senderId: 'sender-123' },
      })
      const res = await testSendle(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when sender ID is missing', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)

      const req = createRequest('/api/shipping/sendle/test', {
        method: 'POST',
        body: { apiKey: 'sk_test_123' },
      })
      const res = await testSendle(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'Sender ID is required' })
    })

    it('returns success when credentials are valid', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)
      vi.mocked(tenants.getTenantById).mockResolvedValue({ id: 'tenant-123' } as any)

      const mockClient = {
        verifyCredentials: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(createSendleClient).mockReturnValue(mockClient as any)
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined)

      const req = createRequest('/api/shipping/sendle/test', {
        method: 'POST',
        body: {
          apiKey: 'sk_test_123',
          senderId: 'sender-123',
          environment: 'sandbox',
        },
      })
      const res = await testSendle(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Connection verified successfully',
      })
      expect(tenants.updateTenant).toHaveBeenCalled()
    })

    it('returns failure when credentials are invalid', async () => {
      mockGetCurrentUser.mockResolvedValue(MOCK_USER)
      vi.mocked(tenants.getTenantById).mockResolvedValue({ id: 'tenant-123' } as any)

      const mockClient = {
        verifyCredentials: vi.fn().mockResolvedValue(false),
      }
      vi.mocked(createSendleClient).mockReturnValue(mockClient as any)

      const req = createRequest('/api/shipping/sendle/test', {
        method: 'POST',
        body: {
          apiKey: 'sk_test_wrong',
          senderId: 'sender-123',
          environment: 'sandbox',
        },
      })
      const res = await testSendle(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({
        success: false,
        message: 'Invalid credentials. Please check your Sender ID and API Key.',
      })
    })
  })
})
