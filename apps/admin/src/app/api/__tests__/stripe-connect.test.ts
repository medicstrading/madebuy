import { tenants } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentTenant = vi.fn()
vi.mock('@/lib/session', () => ({
  getCurrentTenant: () => mockGetCurrentTenant(),
}))

// Mock Stripe
const mockStripe = {
  accounts: {
    retrieve: vi.fn(),
    create: vi.fn(),
    createLoginLink: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
  },
}
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}))

// Import handlers AFTER mocks
import { DELETE, GET, POST } from '../stripe/connect/route'
import { POST as ONBOARDING } from '../stripe/connect/onboarding/route'
import { POST as DASHBOARD } from '../stripe/connect/dashboard/route'

describe('Stripe Connect API', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'test@example.com',
    businessName: 'Test Shop',
    slug: 'test-shop',
    paymentConfig: null,
  }

  const mockAccount = {
    id: 'acct_123',
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    business_type: 'individual',
    requirements: {
      currently_due: [],
      eventually_due: [],
      past_due: [],
      disabled_reason: null,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/stripe/connect', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return not connected if no account', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connected).toBe(false)
      expect(data.status).toBeNull()
    })

    it('should get Stripe Connect status successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            createdAt: new Date('2025-01-01'),
          },
        },
      })
      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
      vi.mocked(tenants.updateStripeConnectStatus).mockResolvedValue()

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connected).toBe(true)
      expect(data.connectAccountId).toBe('acct_123')
      expect(data.status).toBe('active')
      expect(data.chargesEnabled).toBe(true)
      expect(data.payoutsEnabled).toBe(true)
      expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith('acct_123')
    })

    it('should detect restricted account', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            createdAt: new Date('2025-01-01'),
          },
        },
      })
      mockStripe.accounts.retrieve.mockResolvedValue({
        ...mockAccount,
        requirements: {
          currently_due: ['individual.id_number'],
          eventually_due: [],
          past_due: [],
          disabled_reason: null,
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('restricted')
    })

    it('should detect disabled account', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            createdAt: new Date('2025-01-01'),
          },
        },
      })
      mockStripe.accounts.retrieve.mockResolvedValue({
        ...mockAccount,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          disabled_reason: 'rejected.fraud',
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('disabled')
    })
  })

  describe('POST /api/stripe/connect', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/stripe/connect', {
        method: 'POST',
        body: JSON.stringify({ businessType: 'individual' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if already connected', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: { connectAccountId: 'acct_123' },
        },
      })

      const request = new NextRequest('http://localhost/api/stripe/connect', {
        method: 'POST',
        body: JSON.stringify({ businessType: 'individual' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Stripe Connect account already exists')
    })

    it('should return 400 for invalid business type', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const request = new NextRequest('http://localhost/api/stripe/connect', {
        method: 'POST',
        body: JSON.stringify({ businessType: 'invalid' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid business type. Must be "individual" or "company"')
    })

    it('should create Stripe Connect account successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockStripe.accounts.create.mockResolvedValue({ id: 'acct_new' })
      vi.mocked(tenants.initializePaymentConfig).mockResolvedValue()
      vi.mocked(tenants.updateStripeConnectStatus).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/stripe/connect', {
        method: 'POST',
        body: JSON.stringify({ businessType: 'individual' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accountId).toBe('acct_new')
      expect(data.status).toBe('pending')
      expect(mockStripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'AU',
        email: 'test@example.com',
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          tenantId: 'tenant-123',
          tenantSlug: 'test-shop',
        },
      })
      expect(tenants.initializePaymentConfig).toHaveBeenCalledWith('tenant-123')
    })

    it('should support company business type', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)
      mockStripe.accounts.create.mockResolvedValue({ id: 'acct_company' })
      vi.mocked(tenants.initializePaymentConfig).mockResolvedValue()
      vi.mocked(tenants.updateStripeConnectStatus).mockResolvedValue()

      const request = new NextRequest('http://localhost/api/stripe/connect', {
        method: 'POST',
        body: JSON.stringify({ businessType: 'company' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockStripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_type: 'company' }),
      )
    })
  })

  describe('DELETE /api/stripe/connect', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if no account to disconnect', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Stripe Connect account to disconnect')
    })

    it('should disconnect Stripe Connect successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: { connectAccountId: 'acct_123' },
        },
      })
      vi.mocked(tenants.removeStripeConnect).mockResolvedValue()

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Stripe Connect account disconnected')
      expect(tenants.removeStripeConnect).toHaveBeenCalledWith('tenant-123')
    })
  })

  describe('POST /api/stripe/connect/onboarding', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await ONBOARDING()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if no account found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const response = await ONBOARDING()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Stripe Connect account found. Create one first.')
    })

    it('should create onboarding link successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: { connectAccountId: 'acct_123' },
        },
      })
      mockStripe.accountLinks.create.mockResolvedValue({
        url: 'https://connect.stripe.com/onboard/123',
        expires_at: 1738368000,
      })

      const response = await ONBOARDING()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://connect.stripe.com/onboard/123')
      expect(data.expiresAt).toBeDefined()
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_123',
        refresh_url: expect.stringContaining('/dashboard/settings/payments?refresh=true'),
        return_url: expect.stringContaining('/dashboard/settings/payments?onboarding=complete'),
        type: 'account_onboarding',
      })
    })
  })

  describe('POST /api/stripe/connect/dashboard', () => {
    it('should return 401 if unauthorized', async () => {
      mockGetCurrentTenant.mockResolvedValue(null)

      const response = await DASHBOARD()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if no account found', async () => {
      mockGetCurrentTenant.mockResolvedValue(mockTenant)

      const response = await DASHBOARD()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No Stripe Connect account found')
    })

    it('should return 400 if onboarding not complete', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            onboardingComplete: false,
          },
        },
      })

      const response = await DASHBOARD()
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Complete onboarding first before accessing the dashboard')
    })

    it('should create dashboard link successfully', async () => {
      mockGetCurrentTenant.mockResolvedValue({
        ...mockTenant,
        paymentConfig: {
          stripe: {
            connectAccountId: 'acct_123',
            onboardingComplete: true,
          },
        },
      })
      mockStripe.accounts.createLoginLink.mockResolvedValue({
        url: 'https://connect.stripe.com/dashboard/123',
      })

      const response = await DASHBOARD()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://connect.stripe.com/dashboard/123')
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith('acct_123')
    })
  })
})
