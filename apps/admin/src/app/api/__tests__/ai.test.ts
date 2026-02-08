import { captionStyles, media, tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Mock generateCaption from @madebuy/social
const mockGenerateCaption = vi.fn()
vi.mock('@madebuy/social', () => ({
  generateCaption: () => mockGenerateCaption(),
}))

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
}
vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}))

// Import handlers AFTER mocks
import { POST as CAPTION } from '../ai/caption/route'
import { POST as DESCRIPTION } from '../ai/description/route'

describe('AI API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    slug: 'test-shop',
    plan: 'professional',
    features: {
      aiCaptions: true,
    },
    usage: {
      aiCaptionsUsedThisMonth: 5,
    },
  }

  const mockMedia = {
    id: 'media-1',
    tenantId: 'tenant-123',
    variants: {
      original: { url: 'https://example.com/image.jpg' },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/ai/caption', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: ['media-1'] }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if AI captions feature not enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        features: { aiCaptions: false },
      })

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: ['media-1'] }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('AI caption generation requires a Pro or higher plan')
    })

    it('should return 403 if monthly limit reached', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        usage: { aiCaptionsUsedThisMonth: 100 },
      })

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: ['media-1'] }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Monthly AI caption limit reached')
    })

    it('should return 400 if mediaIds missing', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Media IDs required')
    })

    it('should return 400 if mediaIds is not an array', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: 'not-an-array' }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Media IDs required')
    })

    it('should return 400 if mediaIds is empty', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: [] }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Media IDs required')
    })

    it('should return 404 if no valid media found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(media.getMedia).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({ mediaIds: ['media-1'] }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No valid media found')
    })

    it('should generate caption successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(media.getMedia).mockResolvedValue(mockMedia)
      vi.mocked(captionStyles.getCaptionStyleProfile).mockResolvedValue(null)
      mockGenerateCaption.mockResolvedValue({
        caption: 'Beautiful handmade item! #handmade #craft',
        hashtags: ['handmade', 'craft'],
      })
      vi.mocked(tenants.incrementUsage).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({
          mediaIds: ['media-1'],
          productName: 'Test Product',
          productDescription: 'A great product',
          style: 'professional',
          includeHashtags: true,
        }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.caption).toBe('Beautiful handmade item! #handmade #craft')
      expect(data.hashtags).toEqual(['handmade', 'craft'])
      expect(data.hasStyleProfile).toBe(false)
      expect(tenants.incrementUsage).toHaveBeenCalledWith('tenant-123', 'aiCaptionsUsedThisMonth')
    })

    it('should use style profile when platform specified', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      vi.mocked(media.getMedia).mockResolvedValue(mockMedia)
      const mockStyleProfile = {
        platform: 'instagram',
        onboardingComplete: true,
      }
      vi.mocked(captionStyles.getCaptionStyleProfile).mockResolvedValue(mockStyleProfile)
      mockGenerateCaption.mockResolvedValue({
        caption: 'Styled caption',
        hashtags: [],
      })

      const request = new NextRequest('http://localhost/api/ai/caption', {
        method: 'POST',
        body: JSON.stringify({
          mediaIds: ['media-1'],
          platform: 'instagram',
        }),
      })
      const response = await CAPTION(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasStyleProfile).toBe(true)
      expect(data.onboardingComplete).toBe(true)
      expect(captionStyles.getCaptionStyleProfile).toHaveBeenCalledWith('tenant-123', 'instagram')
    })
  })

  describe('POST /api/ai/description', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Product' }),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if AI captions feature not enabled', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        features: { aiCaptions: false },
      })

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Product' }),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('AI description generation requires a Pro or higher plan')
    })

    it('should return 403 if monthly limit reached', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        usage: { aiCaptionsUsedThisMonth: 100 },
      })

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Product' }),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Monthly AI generation limit reached')
    })

    it('should return 400 if name is missing', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should return 400 if name is not a string', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({ name: 123 }),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('should generate description successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'A beautiful handmade ceramic mug, crafted with care.',
            },
          },
        ],
      })
      vi.mocked(tenants.incrementUsage).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/ai/description', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Ceramic Mug',
          category: 'Home & Living',
        }),
      })
      const response = await DESCRIPTION(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.description).toBe('A beautiful handmade ceramic mug, crafted with care.')
      expect(tenants.incrementUsage).toHaveBeenCalledWith('tenant-123', 'aiCaptionsUsedThisMonth')
    })

    it('should return 429 if rate limit exceeded', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      // Make 11 requests to exceed rate limit
      const requests = []
      for (let i = 0; i < 11; i++) {
        const request = new NextRequest('http://localhost/api/ai/description', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Product' }),
        })
        requests.push(DESCRIPTION(request))
      }

      const responses = await Promise.all(requests)
      const lastResponse = responses[10]
      const data = await lastResponse?.json()

      expect(lastResponse?.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded. Please wait a moment.')
    })
  })
})
