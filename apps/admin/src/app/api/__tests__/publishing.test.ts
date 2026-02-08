import { publish } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Mock executePublishRecord
const mockExecutePublishRecord = vi.fn()
vi.mock('@/lib/publish-execute', () => ({
  executePublishRecord: () => mockExecutePublishRecord(),
}))

// Import handlers AFTER mocks
import { GET, POST } from '../publish/route'
import { DELETE, GET as GET_BY_ID, PATCH } from '../publish/[id]/route'
import { POST as EXECUTE } from '../publish/[id]/execute/route'

describe('Publishing API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    slug: 'test-shop',
    features: {
      socialPublishing: true,
    },
    socialConnections: [
      { platform: 'instagram', isActive: true },
    ],
    websiteDesign: {
      blog: { enabled: true },
    },
  }

  const mockPublishRecord = {
    id: 'publish-1',
    tenantId: 'tenant-123',
    platforms: ['instagram'],
    content: 'Check out our new product!',
    mediaIds: ['media-1'],
    scheduledAt: new Date('2025-02-10'),
    status: 'scheduled',
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/publish', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should list publish records successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.listPublishRecords).mockResolvedValue([mockPublishRecord])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.publishRecords).toHaveLength(1)
      expect(data.publishRecords[0].id).toBe('publish-1')
      expect(publish.listPublishRecords).toHaveBeenCalledWith('tenant-123')
    })
  })

  describe('POST /api/publish', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          platforms: ['instagram'],
          content: 'New post',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if social publishing not enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        features: { socialPublishing: false },
      })

      const request = new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          platforms: ['instagram'],
          content: 'New post',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Social publishing requires a Maker or higher plan')
    })

    it('should return 400 if platform not connected', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        socialConnections: [],
      })

      const request = new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          platforms: ['instagram'],
          content: 'New post',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Not connected to platforms: instagram')
    })

    it('should create publish record successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.createPublishRecord).mockResolvedValue(mockPublishRecord)

      const request = new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          platforms: ['instagram'],
          content: 'New post',
          mediaIds: ['media-1'],
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.publishRecord.id).toBe('publish-1')
      expect(publish.createPublishRecord).toHaveBeenCalledWith('tenant-123', {
        platforms: ['instagram'],
        content: 'New post',
        mediaIds: ['media-1'],
      })
    })

    it('should allow website-blog if enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.createPublishRecord).mockResolvedValue({
        ...mockPublishRecord,
        platforms: ['website-blog'],
      })

      const request = new NextRequest('http://localhost/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          platforms: ['website-blog'],
          content: 'Blog post',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
    })
  })

  describe('GET /api/publish/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1')
      const response = await GET_BY_ID(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if social publishing not enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        features: { socialPublishing: false },
      })

      const request = new NextRequest('http://localhost/api/publish/publish-1')
      const response = await GET_BY_ID(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Social publishing not available on your plan')
    })

    it('should return 404 if publish record not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1')
      const response = await GET_BY_ID(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Publish record not found')
    })

    it('should get publish record successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord).mockResolvedValue(mockPublishRecord)

      const request = new NextRequest('http://localhost/api/publish/publish-1')
      const response = await GET_BY_ID(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.publishRecord.id).toBe('publish-1')
    })
  })

  describe('PATCH /api/publish/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
      })
      const response = await PATCH(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if publish record not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
      })
      const response = await PATCH(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Publish record not found')
    })

    it('should update publish record successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord)
        .mockResolvedValueOnce(mockPublishRecord)
        .mockResolvedValueOnce({ ...mockPublishRecord, content: 'Updated' })
      vi.mocked(publish.updatePublishRecord).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
      })
      const response = await PATCH(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.publishRecord.content).toBe('Updated')
      expect(publish.updatePublishRecord).toHaveBeenCalledWith('tenant-123', 'publish-1', {
        content: 'Updated',
      })
    })
  })

  describe('DELETE /api/publish/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if publish record not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Publish record not found')
    })

    it('should delete publish record successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(publish.getPublishRecord).mockResolvedValue(mockPublishRecord)
      vi.mocked(publish.deletePublishRecord).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/publish/publish-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(publish.deletePublishRecord).toHaveBeenCalledWith('tenant-123', 'publish-1')
    })
  })

  describe('POST /api/publish/[id]/execute', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/publish/publish-1/execute', {
        method: 'POST',
      })
      const response = await EXECUTE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if publish record not found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockExecutePublishRecord.mockResolvedValue({
        error: 'Publish record not found',
        success: false,
        results: [],
      })

      const request = new NextRequest('http://localhost/api/publish/publish-1/execute', {
        method: 'POST',
      })
      const response = await EXECUTE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Publish record not found')
    })

    it('should return 400 if post already published', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockExecutePublishRecord.mockResolvedValue({
        error: 'Post already published',
        success: false,
        results: [],
      })

      const request = new NextRequest('http://localhost/api/publish/publish-1/execute', {
        method: 'POST',
      })
      const response = await EXECUTE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Post already published')
    })

    it('should execute publish successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockExecutePublishRecord.mockResolvedValue({
        success: true,
        results: [
          { platform: 'instagram', success: true, postId: 'ig-123' },
        ],
      })

      const request = new NextRequest('http://localhost/api/publish/publish-1/execute', {
        method: 'POST',
      })
      const response = await EXECUTE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(1)
      expect(data.results[0].platform).toBe('instagram')
    })

    it('should handle partial success', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockExecutePublishRecord.mockResolvedValue({
        success: false,
        results: [
          { platform: 'instagram', success: true, postId: 'ig-123' },
          { platform: 'facebook', success: false, error: 'API error' },
        ],
      })

      const request = new NextRequest('http://localhost/api/publish/publish-1/execute', {
        method: 'POST',
      })
      const response = await EXECUTE(request, { params: { id: 'publish-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.results).toHaveLength(2)
    })
  })
})
