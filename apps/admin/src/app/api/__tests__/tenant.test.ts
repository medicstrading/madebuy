import { tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentUser = vi.fn()
const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

const mockSafeValidateUpdateTenant = vi.fn()
const mockSanitizeInput = vi.fn((input: string) => input)
vi.mock('@madebuy/shared', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    safeValidateUpdateTenant: (data: unknown) =>
      mockSafeValidateUpdateTenant(data),
    sanitizeInput: (input: string) => mockSanitizeInput(input),
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  }
})

// Import handlers AFTER mocks
import { GET, PATCH } from '../tenant/route'
import { GET as getNotifications, PUT as putNotifications } from '../tenant/notifications/route'
import { GET as getTax, PUT as putTax } from '../tenant/tax/route'

describe('Tenant API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tenant', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return tenant successfully', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('tenant-123')
      expect(data.businessName).toBe('Test Shop')
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

  describe('PATCH /api/tenant', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: 'New Name' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update tenant successfully', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockSafeValidateUpdateTenant.mockReturnValue({
        success: true,
        data: { businessName: 'Updated Shop' },
      })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Updated Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: 'Updated Shop' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.businessName).toBe('Updated Shop')
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        businessName: 'Updated Shop',
      })
    })

    it('should return 400 for validation errors', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockSafeValidateUpdateTenant.mockReturnValue({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: { businessName: ['Business name is required'] },
          }),
        },
      })

      const request = new NextRequest('http://localhost/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: '' }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when no valid fields to update', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'tenant-123', email: 'test@example.com' })
      mockSafeValidateUpdateTenant.mockReturnValue({
        success: true,
        data: {},
      })

      const request = new NextRequest('http://localhost/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No valid fields to update')
    })
  })

  describe('GET /api/tenant/notifications', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await getNotifications()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return default preferences when none set', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
      })

      const response = await getNotifications()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual({
        orderNotifications: true,
        lowStockNotifications: true,
        disputeNotifications: true,
        payoutNotifications: true,
        reviewNotifications: true,
        enquiryNotifications: true,
        newsletterUpdates: false,
      })
    })

    it('should return existing preferences', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        notificationPreferences: {
          orderNotifications: false,
          lowStockNotifications: true,
          disputeNotifications: true,
          payoutNotifications: false,
          reviewNotifications: true,
          enquiryNotifications: true,
          newsletterUpdates: true,
        },
      })

      const response = await getNotifications()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences.orderNotifications).toBe(false)
      expect(data.preferences.newsletterUpdates).toBe(true)
    })
  })

  describe('PUT /api/tenant/notifications', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new Request('http://localhost/api/tenant/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: {} }),
      })

      const response = await putNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update notification preferences successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const preferences = {
        orderNotifications: false,
        lowStockNotifications: true,
        disputeNotifications: false,
        payoutNotifications: true,
        reviewNotifications: false,
        enquiryNotifications: true,
        newsletterUpdates: true,
      }

      const request = new Request('http://localhost/api/tenant/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      const response = await putNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.preferences).toEqual(preferences)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        notificationPreferences: preferences,
      })
    })

    it('should return 400 for invalid preferences data', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const request = new Request('http://localhost/api/tenant/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: 'invalid' }),
      })

      const response = await putNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid preferences data')
    })
  })

  describe('GET /api/tenant/tax', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await getTax()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return default tax settings when none set', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await getTax()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.taxSettings).toEqual({
        gstRegistered: false,
        abn: '',
        gstRate: 10,
        pricesIncludeGst: true,
      })
    })

    it('should return existing tax settings', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })
      vi.mocked(tenants.getTenantById).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        features: {},
        taxSettings: {
          gstRegistered: true,
          abn: '12345678901',
          gstRate: 10,
          pricesIncludeGst: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await getTax()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.taxSettings.gstRegistered).toBe(true)
      expect(data.taxSettings.abn).toBe('12345678901')
    })
  })

  describe('PUT /api/tenant/tax', () => {
    it('should return 401 when unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxSettings: {} }),
      })

      const response = await putTax(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should update tax settings successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const taxSettings = {
        gstRegistered: true,
        abn: '12345678901',
        gstRate: 10,
        pricesIncludeGst: false,
      }

      const request = new NextRequest('http://localhost/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxSettings }),
      })

      const response = await putTax(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        taxSettings,
      })
    })

    it('should return 400 when tax settings missing', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const request = new NextRequest('http://localhost/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await putTax(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Tax settings required')
    })

    it('should return 400 for invalid ABN format', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const request = new NextRequest('http://localhost/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxSettings: {
            gstRegistered: true,
            abn: '123', // Invalid - too short
            gstRate: 10,
            pricesIncludeGst: true,
          },
        }),
      })

      const response = await putTax(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid ABN format. Must be exactly 11 digits.')
    })

    it('should return 400 for invalid GST rate', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
      })

      const request = new NextRequest('http://localhost/api/tenant/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxSettings: {
            gstRegistered: false,
            gstRate: 150, // Invalid - too high
            pricesIncludeGst: true,
          },
        }),
      })

      const response = await putTax(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('GST rate must be between 0 and 100')
    })
  })
})
