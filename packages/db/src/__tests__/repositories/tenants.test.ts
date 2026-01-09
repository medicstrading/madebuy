/**
 * Tests for tenants repository
 * Covers CRUD operations and payment configuration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { seedMockCollection, getMockCollectionData } from '../setup'
import * as tenants from '../../repositories/tenants'

describe('Tenants Repository', () => {
  const mockTenantData = {
    id: 'tenant-123',
    slug: 'test-shop',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    businessName: 'Test Shop',
    primaryColor: '#2563eb',
    accentColor: '#10b981',
    domainStatus: 'none' as const,
    features: {
      socialPublishing: false,
      aiCaptions: false,
      unlimitedPieces: false,
      customDomain: false,
      prioritySupport: false,
      apiAccess: false,
      advancedAnalytics: false,
    },
    plan: 'free' as const,
    onboardingComplete: false,
    onboardingStep: 'domain' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('createTenant', () => {
    it('should create a new tenant with default values', async () => {
      const tenant = await tenants.createTenant(
        'new@example.com',
        'hashed-pw',
        'New Business'
      )

      expect(tenant).toBeDefined()
      expect(tenant.id).toBeDefined()
      expect(tenant.email).toBe('new@example.com')
      expect(tenant.businessName).toBe('New Business')
      expect(tenant.slug).toBe('new-business')
      expect(tenant.plan).toBe('free')
      expect(tenant.onboardingComplete).toBe(false)
      expect(tenant.features.socialPublishing).toBe(false)
    })

    it('should generate slug from email when no business name', async () => {
      const tenant = await tenants.createTenant(
        'user@example.com',
        'hashed-pw',
        ''
      )

      expect(tenant.slug).toBe('user')
    })

    it('should sanitize slug from special characters', async () => {
      const tenant = await tenants.createTenant(
        'test@example.com',
        'hashed-pw',
        'My Shop & Store!'
      )

      expect(tenant.slug).toBe('my-shop-store')
    })
  })

  describe('getTenantById', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should return tenant when found', async () => {
      const tenant = await tenants.getTenantById('tenant-123')

      expect(tenant).toBeDefined()
      expect(tenant?.id).toBe('tenant-123')
      expect(tenant?.email).toBe('test@example.com')
    })

    it('should return null when tenant not found', async () => {
      const tenant = await tenants.getTenantById('non-existent')

      expect(tenant).toBeNull()
    })
  })

  describe('getTenantByEmail', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should return tenant when email matches', async () => {
      const tenant = await tenants.getTenantByEmail('test@example.com')

      expect(tenant).toBeDefined()
      expect(tenant?.email).toBe('test@example.com')
    })

    it('should return null for non-existent email', async () => {
      const tenant = await tenants.getTenantByEmail('unknown@example.com')

      expect(tenant).toBeNull()
    })
  })

  describe('getTenantBySlug', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should return tenant when slug matches', async () => {
      const tenant = await tenants.getTenantBySlug('test-shop')

      expect(tenant).toBeDefined()
      expect(tenant?.slug).toBe('test-shop')
    })

    it('should return null for non-existent slug', async () => {
      const tenant = await tenants.getTenantBySlug('unknown-shop')

      expect(tenant).toBeNull()
    })
  })

  describe('updateTenant', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should update tenant fields', async () => {
      await tenants.updateTenant('tenant-123', {
        businessName: 'Updated Shop',
        primaryColor: '#ff0000',
      })

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.businessName).toBe('Updated Shop')
      expect(updated?.primaryColor).toBe('#ff0000')
      expect(updated?.updatedAt).toBeInstanceOf(Date)
    })

    it('should not modify id or createdAt', async () => {
      const originalCreatedAt = mockTenantData.createdAt

      await tenants.updateTenant('tenant-123', {
        businessName: 'Updated Shop',
      })

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.id).toBe('tenant-123')
      expect(updated?.createdAt).toEqual(originalCreatedAt)
    })
  })

  describe('deleteTenant', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should delete tenant by id', async () => {
      await tenants.deleteTenant('tenant-123')

      const data = getMockCollectionData('tenants')
      expect(data).toHaveLength(0)
    })

    it('should not throw for non-existent tenant', async () => {
      await expect(tenants.deleteTenant('non-existent')).resolves.not.toThrow()
    })
  })

  describe('Stripe Connect', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should update Stripe Connect status', async () => {
      await tenants.updateStripeConnectStatus('tenant-123', {
        connectAccountId: 'acct_123',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.paymentConfig?.stripe?.connectAccountId).toBe('acct_123')
      expect(updated?.paymentConfig?.stripe?.status).toBe('active')
      expect(updated?.paymentConfig?.stripe?.chargesEnabled).toBe(true)
    })

    it('should remove Stripe Connect', async () => {
      // First set up Stripe Connect
      seedMockCollection('tenants', [{
        ...mockTenantData,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            status: 'active',
            chargesEnabled: true,
            payoutsEnabled: true,
          },
          enabledMethods: ['stripe'],
        },
      }])

      await tenants.removeStripeConnect('tenant-123')

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.paymentConfig?.stripe).toBeUndefined()
    })
  })

  describe('Usage Tracking', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [{
        ...mockTenantData,
        usage: {
          storageUsedMB: 100,
          aiCaptionsUsedThisMonth: 5,
          ordersThisMonth: 10,
          lastResetDate: new Date('2024-01-01'),
        },
      }])
    })

    it('should increment usage counter', async () => {
      await tenants.incrementUsage('tenant-123', 'storageUsedMB', 50)

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.usage?.storageUsedMB).toBe(150)
    })

    it('should reset monthly usage', async () => {
      await tenants.resetMonthlyUsage('tenant-123')

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.usage?.aiCaptionsUsedThisMonth).toBe(0)
      expect(updated?.usage?.ordersThisMonth).toBe(0)
    })
  })

  describe('Onboarding', () => {
    beforeEach(() => {
      seedMockCollection('tenants', [mockTenantData])
    })

    it('should update onboarding step', async () => {
      await tenants.updateOnboardingStep('tenant-123', 'payment')

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.onboardingStep).toBe('payment')
    })

    it('should complete onboarding', async () => {
      await tenants.completeOnboarding('tenant-123')

      const data = getMockCollectionData('tenants')
      const updated = data.find(t => t.id === 'tenant-123')

      expect(updated?.onboardingComplete).toBe(true)
      expect(updated?.onboardingStep).toBe('complete')
    })

    it('should check if tenant needs onboarding', async () => {
      // Re-seed to ensure clean state with onboardingComplete: false
      seedMockCollection('tenants', [{
        id: 'tenant-123',
        slug: 'test-shop',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        businessName: 'Test Shop',
        primaryColor: '#2563eb',
        accentColor: '#10b981',
        domainStatus: 'none',
        features: {
          socialPublishing: false,
          aiCaptions: false,
          unlimitedPieces: false,
          customDomain: false,
          prioritySupport: false,
          apiAccess: false,
          advancedAnalytics: false,
        },
        plan: 'free',
        onboardingComplete: false,
        onboardingStep: 'domain',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }])

      const needs = await tenants.needsOnboarding('tenant-123')
      expect(needs).toBe(true)

      await tenants.completeOnboarding('tenant-123')
      const needsAfter = await tenants.needsOnboarding('tenant-123')
      expect(needsAfter).toBe(false)
    })
  })
})
