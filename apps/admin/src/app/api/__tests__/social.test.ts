import { getDatabase, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Use vi.hoisted to avoid initialization order issues
const { mockLateClient, mockCrypto, mockDb, mockCollection } = vi.hoisted(() => {
  const mockCollection = {
    insertOne: vi.fn(),
    findOneAndDelete: vi.fn(),
  }
  return {
    mockLateClient: {
      getConnectUrl: vi.fn(),
      getOAuthToken: vi.fn(),
    },
    mockCrypto: {
      randomBytes: vi.fn(() => ({
        toString: () => 'random-nonce-123',
      })),
    },
    mockDb: {
      collection: vi.fn(() => mockCollection),
    },
    mockCollection,
  }
})

// Mock @madebuy/social with hoisted client
vi.mock('@madebuy/social', () => ({
  lateClient: mockLateClient,
}))

// Mock crypto with hoisted randomBytes
vi.mock('node:crypto', () => ({
  default: mockCrypto,
}))

// Mock getDatabase with hoisted db
vi.mock('@madebuy/db', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    getDatabase: vi.fn(() => mockDb),
  }
})

// Import handlers AFTER mocks
import { POST as CONNECT } from '../social/connect/[platform]/route'
import { DELETE as DISCONNECT } from '../social/disconnect/[platform]/route'
import { GET as CALLBACK } from '../social/callback/route'

describe('Social API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/social/connect/[platform]', () => {
    it('should return 401 if unauthorized', async () => {
      mockUnauthorized()

      const request = new NextRequest('http://localhost/api/social/connect/instagram', {
        method: 'POST',
      })
      const response = await CONNECT(request, { params: { platform: 'instagram' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid platform', async () => {
      mockCurrentTenant({
      ...MOCK_TENANT_FREE,
      socialConnections: [],
    })

      const request = new NextRequest('http://localhost/api/social/connect/invalid', {
        method: 'POST',
      })
      const response = await CONNECT(request, { params: { platform: 'invalid' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid platform')
    })

    it('should initiate OAuth flow successfully', async () => {
      mockCurrentTenant({
      ...MOCK_TENANT_FREE,
      socialConnections: [],
    })
      mockLateClient.getConnectUrl.mockResolvedValue('https://oauth.example.com/authorize')
      mockCollection.insertOne.mockResolvedValue(undefined as any)

      const request = new NextRequest('http://localhost/api/social/connect/instagram', {
        method: 'POST',
      })
      const response = await CONNECT(request, { params: { platform: 'instagram' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authUrl).toBe('https://oauth.example.com/authorize')
      expect(data.state).toBe('random-nonce-123')
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          nonce: 'random-nonce-123',
          tenantId: 'tenant-123',
          platform: 'instagram',
        }),
      )
    })

    it('should support all valid platforms', async () => {
      mockCurrentTenant({
      ...MOCK_TENANT_FREE,
      socialConnections: [],
    })
      mockLateClient.getConnectUrl.mockResolvedValue('https://oauth.example.com/authorize')
      mockCollection.insertOne.mockResolvedValue(undefined as any)

      const platforms = ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube']

      for (const platform of platforms) {
        const request = new NextRequest(`http://localhost/api/social/connect/${platform}`, {
          method: 'POST',
        })
        const response = await CONNECT(request, { params: { platform } })
        expect(response.status).toBe(200)
      }
    })
  })

  describe('DELETE /api/social/disconnect/[platform]', () => {
    it('should return 401 if unauthorized', async () => {
      mockUnauthorized()

      const request = new NextRequest('http://localhost/api/social/disconnect/instagram', {
        method: 'DELETE',
      })
      const response = await DISCONNECT(request, { params: { platform: 'instagram' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it.skip('should disconnect platform successfully', async () => {
      mockCurrentTenant({
        ...MOCK_TENANT_FREE,
        socialConnections: [
          { platform: 'instagram', isActive: true },
          { platform: 'facebook', isActive: true },
        ],
      });
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined as any)

      const request = new NextRequest('http://localhost/api/social/disconnect/instagram', {
        method: 'DELETE',
      })
      const response = await DISCONNECT(request, { params: { platform: 'instagram' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        socialConnections: [{ platform: 'facebook', isActive: true }],
      })
    })

    it.skip('should handle disconnecting non-connected platform', async () => {
      mockCurrentTenant({
        ...MOCK_TENANT_FREE,
        socialConnections: [],
      });
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined as any)

      const request = new NextRequest('http://localhost/api/social/disconnect/instagram', {
        method: 'DELETE',
      })
      const response = await DISCONNECT(request, { params: { platform: 'instagram' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        socialConnections: [],
      })
    })
  })

  describe('GET /api/social/callback', () => {
    it('should redirect with error if OAuth error present', async () => {
      const request = new NextRequest('http://localhost/api/social/callback?error=access_denied')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?error=oauth_failed')
    })

    it('should redirect with error if code missing', async () => {
      const request = new NextRequest('http://localhost/api/social/callback?state=abc')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?error=missing_params')
    })

    it('should redirect with error if state missing', async () => {
      const request = new NextRequest('http://localhost/api/social/callback?code=abc')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?error=missing_params')
    })

    it('should redirect with error if state is invalid', async () => {
      mockCollection.findOneAndDelete.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/social/callback?code=abc&state=invalid')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?error=invalid_state')
    })

    it.skip('should redirect with error if tenant not found', async () => {
      mockCollection.findOneAndDelete.mockResolvedValue({
        tenantId: 'tenant-123',
        platform: 'instagram',
      })
      mockLateClient.getOAuthToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
      vi.mocked(tenants.getTenantById).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/social/callback?code=abc&state=valid-state')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?error=tenant_not_found')
    })

    it.skip('should complete OAuth callback successfully', async () => {
      mockCollection.findOneAndDelete.mockResolvedValue({
        tenantId: 'tenant-123',
        platform: 'instagram',
      })
      mockLateClient.getOAuthToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        ...MOCK_TENANT_FREE,
        socialConnections: [],
      } as any);
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined as any)

      const request = new NextRequest('http://localhost/api/social/callback?code=abc&state=valid-state')
      const response = await CALLBACK(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard/connections?success=instagram')
      expect(tenants.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          socialConnections: expect.arrayContaining([
            expect.objectContaining({
              platform: 'instagram',
              method: 'late',
              isActive: true,
            }),
          ]),
        }),
      )
    })
  })
})
