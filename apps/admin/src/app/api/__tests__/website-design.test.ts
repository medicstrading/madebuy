import { tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentUser = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

const mockCanUseBlog = vi.fn()
const mockValidateWebsiteDesignUpdate = vi.fn()
vi.mock('@/lib/website-design', () => ({
  canUseBlog: (tenant: unknown) => mockCanUseBlog(tenant),
  validateWebsiteDesignUpdate: (tenant: unknown, updates: unknown) =>
    mockValidateWebsiteDesignUpdate(tenant, updates),
}))

// Import handlers AFTER mocks
import { GET, PATCH } from '../website-design/route'
import { PATCH as patchLogo } from '../website-design/logo/route'

describe('Website Design API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/website-design', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return website design successfully', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        primaryColor: '#ff0000',
        accentColor: '#00ff00',
        websiteDesign: {
          template: 'modern',
          pages: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.primaryColor).toBe('#ff0000')
      expect(data.accentColor).toBe('#00ff00')
      expect(data.websiteDesign.template).toBe('modern')
    })

    it('should return 404 when tenant not found', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      vi.mocked(tenants.getTenantById).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Tenant not found')
    })
  })

  describe('PATCH /api/website-design - Plan Matrix Tests', () => {
    it('should allow template/pages updates for FREE plan', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-free', email: 'free@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-free',
        email: 'free@example.com',
        businessName: 'Free Shop',
        slug: 'free-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'classic',
          pages: [{ slug: 'home', title: 'Home' }],
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-free', {
        websiteDesign: {
          template: 'classic',
          pages: [{ slug: 'home', title: 'Home' }],
        },
      })
    })

    it('should allow template/pages updates for MAKER plan', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-maker', email: 'maker@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-maker',
        email: 'maker@example.com',
        businessName: 'Maker Shop',
        slug: 'maker-shop',
        plan: 'maker',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'modern',
          pages: [{ slug: 'about', title: 'About Us' }],
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-maker', {
        websiteDesign: {
          template: 'modern',
          pages: [{ slug: 'about', title: 'About Us' }],
        },
      })
    })

    it('should allow template/pages updates for PRO plan', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-pro', email: 'pro@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-pro',
        email: 'pro@example.com',
        businessName: 'Pro Shop',
        slug: 'pro-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'elegant',
          pages: [{ slug: 'shop', title: 'Shop' }],
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-pro', {
        websiteDesign: {
          template: 'elegant',
          pages: [{ slug: 'shop', title: 'Shop' }],
        },
      })
    })

    it('should allow template/pages updates for STUDIO plan', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-studio', email: 'studio@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-studio',
        email: 'studio@example.com',
        businessName: 'Studio Shop',
        slug: 'studio-shop',
        plan: 'studio',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'creative',
          pages: [{ slug: 'contact', title: 'Contact' }],
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-studio', {
        websiteDesign: {
          template: 'creative',
          pages: [{ slug: 'contact', title: 'Contact' }],
        },
      })
    })
  })

  describe('PATCH /api/website-design - Feature Gating', () => {
    it('should block banner customization when validateWebsiteDesignUpdate fails', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({
        valid: false,
        error: 'Banner customization requires Professional plan or higher.',
      })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner: { imageUrl: 'https://example.com/banner.jpg' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Banner customization requires Professional plan or higher.')
    })

    it('should block typography customization when validateWebsiteDesignUpdate fails', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({
        valid: false,
        error: 'Typography customization requires Professional plan or higher.',
      })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typography: { fontFamily: 'Roboto' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Typography customization requires Professional plan or higher.')
    })

    it('should block layout customization when validateWebsiteDesignUpdate fails', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({
        valid: false,
        error: 'Layout customization requires Professional plan or higher.',
      })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: { columns: 3 },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Layout customization requires Professional plan or higher.')
    })

    it('should block blog feature when canUseBlog returns false', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })
      mockCanUseBlog.mockReturnValue(false)

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog: { enabled: true },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Blog feature requires Business plan or higher.')
    })
  })

  describe('PATCH /api/website-design - Field Name Handling', () => {
    it('should handle headerConfig field name correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerConfig: { logo: 'left', nav: 'right' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          headerConfig: { logo: 'left', nav: 'right' },
        },
      })
    })

    it('should handle footerConfig field name correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          footerConfig: { copyright: '2025 Test Shop' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          footerConfig: { copyright: '2025 Test Shop' },
        },
      })
    })

    it('should normalize header to headerConfig', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: { style: 'minimal' },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          headerConfig: { style: 'minimal' },
        },
      })
    })

    it('should normalize footer to footerConfig', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          footer: { links: [] },
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          footerConfig: { links: [] },
        },
      })
    })
  })

  describe('PATCH /api/website-design - Logo Fields', () => {
    it('should save logoMediaId correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoMediaId: 'media-123',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          logoMediaId: 'media-123',
        },
      })
    })

    it('should save logoUrl correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockValidateWebsiteDesignUpdate.mockReturnValue({ valid: true })

      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'professional',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl: 'https://example.com/logo.png',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        websiteDesign: {
          logoUrl: 'https://example.com/logo.png',
        },
      })
    })
  })

  describe('PATCH /api/website-design/logo', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/website-design/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoMediaId: 'media-123' }),
      })

      const response = await patchLogo(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update logo successfully', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoMediaId: 'media-456' }),
      })

      const response = await patchLogo(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        logoMediaId: 'media-456',
      })
    })

    it('should clear logo when logoMediaId is null', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        websiteDesign: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/website-design/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoMediaId: null }),
      })

      const response = await patchLogo(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        logoMediaId: undefined,
      })
    })
  })
})
