import { tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentTenant } from '@/lib/session'

// Mock Stripe - use vi.hoisted to avoid hoisting conflicts
const { mockStripeCheckoutSessionCreate, mockStripeBillingPortalSessionCreate, mockStripeCustomersCreate } = vi.hoisted(() => ({
  mockStripeCheckoutSessionCreate: vi.fn(),
  mockStripeBillingPortalSessionCreate: vi.fn(),
  mockStripeCustomersCreate: vi.fn(),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockStripeCheckoutSessionCreate,
        },
      },
      billingPortal: {
        sessions: {
          create: mockStripeBillingPortalSessionCreate,
        },
      },
      customers: {
        create: mockStripeCustomersCreate,
      },
    })),
  }
})

// Import handlers AFTER mocks
import { POST as checkoutPost } from '../billing/checkout/route'
import { POST as portalPost } from '../billing/portal/route'

describe('Billing API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/billing/checkout', () => {
    it('should return 401 when unauthorized', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'maker' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should create checkout session successfully for maker plan', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        stripeCustomerId: 'cus_123',
      })

      mockStripeCheckoutSessionCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      })

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'maker' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
      expect(mockStripeCheckoutSessionCreate).toHaveBeenCalled()
    })

    it('should create Stripe customer if not exists', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        slug: 'test-shop',
        plan: 'free',
        stripeCustomerId: null,
      })

      mockStripeCustomersCreate.mockResolvedValue({
        id: 'cus_new_123',
      })

      mockStripeCheckoutSessionCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      })

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'professional' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Shop',
        metadata: {
          tenantId: 'tenant-123',
          tenantSlug: 'test-shop',
        },
      })
      expect(tenants.updateTenant).toHaveBeenCalledWith('tenant-123', {
        stripeCustomerId: 'cus_new_123',
      })
    })

    it('should return 400 for invalid plan', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        plan: 'free',
      })

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'invalid-plan' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan selected')
    })

    it('should return 400 when trying to downgrade to free', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        plan: 'maker',
      })

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'free' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan selected')
    })

    it('should return 400 when tenant already has subscription', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        plan: 'maker',
        subscriptionId: 'sub_existing',
      })

      const request = new NextRequest('http://localhost/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'professional' }),
      })

      const response = await checkoutPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('You already have an active subscription. Use the billing portal to change plans.')
      expect(data.code).toBe('SUBSCRIPTION_EXISTS')
    })
  })

  describe('POST /api/billing/portal', () => {
    it('should return 401 when unauthorized', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await portalPost(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Please log in to continue.')
    })

    it('should create billing portal session successfully', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        stripeCustomerId: 'cus_123',
      })

      mockStripeBillingPortalSessionCreate.mockResolvedValue({
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
      })

      const request = new NextRequest('http://localhost/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await portalPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://billing.stripe.com/session/bps_123')
      expect(mockStripeBillingPortalSessionCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3300/dashboard/settings/billing',
      })
    })

    it('should return 400 when no Stripe customer ID', async () => {
      vi.mocked(getCurrentTenant).mockResolvedValue({
        id: 'tenant-123',
        email: 'test@example.com',
        businessName: 'Test Shop',
        stripeCustomerId: null,
      })

      const request = new NextRequest('http://localhost/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await portalPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please check your input and try again.')
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })
})
