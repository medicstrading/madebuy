/**
 * Comprehensive tests for Stripe webhook handlers
 *
 * Test Cases (9 total):
 * 1. checkout.session.completed - Creates order, updates stock, sends email
 * 2. checkout.session.completed - Idempotency (duplicate events ignored)
 * 3. payment_intent.payment_failed - Cancels stock reservations
 * 4. checkout.session.expired - Releases reservations
 * 5. customer.subscription.created - Updates tenant plan
 * 6. customer.subscription.deleted - Downgrades to free
 * 7. invoice.payment_failed - Sends notification email
 * 8. Invalid signature - Returns 400
 * 9. Missing tenantId in metadata - Logs error, returns 200
 */

import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// =============================================================================
// MOCKS - Must be hoisted before imports
// =============================================================================

// Hoist mock functions so they can be used in vi.mock
const {
  mockConstructEvent,
  mockSendOrderConfirmation,
  mockSendDownloadEmail,
  mockSendLowStockAlertEmail,
  mockSendPaymentFailedEmail,
  mockSendSubscriptionCancelledEmail,
  mockLogError,
  mockLogInfo,
  mockLogWarn,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockSendOrderConfirmation: vi.fn().mockResolvedValue(true),
  mockSendDownloadEmail: vi.fn().mockResolvedValue(true),
  mockSendLowStockAlertEmail: vi.fn().mockResolvedValue({ success: true }),
  mockSendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
  mockSendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(true),
  mockLogError: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
}))

// Mock environment variables
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_mock')
vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_mock')
vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/madebuy-test')
vi.stubEnv('STRIPE_PRICE_MAKER_MONTHLY', 'price_maker_monthly')
vi.stubEnv('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'price_professional_monthly')
vi.stubEnv('STRIPE_PRICE_STUDIO_MONTHLY', 'price_studio_monthly')

// Mock @madebuy/db
vi.mock('@madebuy/db', () => ({
  downloads: {
    createDownloadRecord: vi.fn().mockResolvedValue({
      id: 'download-123',
      downloadToken: 'token-abc123',
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
    getDownloadRecordByToken: vi.fn().mockResolvedValue({
      id: 'download-123',
      downloadToken: 'token-abc123',
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
  },
  orders: {
    getOrderByStripeSessionId: vi.fn(),
    createOrder: vi.fn(),
  },
  pieces: {
    getPiece: vi.fn(),
    getLowStockPieces: vi.fn(),
  },
  tenants: {
    getTenantById: vi.fn(),
    updateTenant: vi.fn(),
    getTenantByStripeCustomerId: vi.fn(),
  },
  stockReservations: {
    completeReservation: vi.fn(),
    cancelReservation: vi.fn(),
  },
  transactions: {
    createTransaction: vi.fn(),
  },
}))

// Mock Stripe SDK
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    })),
  }
})

// Mock email functions
vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mockSendOrderConfirmation,
  sendDownloadEmail: mockSendDownloadEmail,
  sendLowStockAlertEmail: mockSendLowStockAlertEmail,
  sendPaymentFailedEmail: mockSendPaymentFailedEmail,
  sendSubscriptionCancelledEmail: mockSendSubscriptionCancelledEmail,
}))

// Mock @madebuy/shared with logger
vi.mock('@madebuy/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@madebuy/shared')>()
  return {
    ...actual,
    createLogger: vi.fn(() => ({
      info: mockLogInfo,
      error: mockLogError,
      warn: mockLogWarn,
      debug: vi.fn(),
      child: vi.fn(() => ({
        info: mockLogInfo,
        error: mockLogError,
        warn: mockLogWarn,
        debug: vi.fn(),
      })),
    })),
  }
})

// Import after mocks are set up
import {
  downloads,
  orders,
  pieces,
  stockReservations,
  tenants,
  transactions,
} from '@madebuy/db'
import { POST } from '../route'

// =============================================================================
// FACTORY HELPERS - Create test Stripe events
// =============================================================================

function createMockRequest(body: string, signature = 'valid_sig'): NextRequest {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name: string) => (name === 'stripe-signature' ? signature : null),
    },
  } as unknown as NextRequest
}

function createCheckoutSessionEvent(
  sessionOverrides: Partial<Stripe.Checkout.Session> = {},
  metadataOverrides: Record<string, string> = {},
): Stripe.Event {
  const session: Stripe.Checkout.Session = {
    id: 'cs_test_123',
    object: 'checkout.session',
    customer_details: {
      email: 'customer@example.com',
      phone: null,
      tax_exempt: 'none',
      tax_ids: null,
      name: null,
      address: null,
    },
    customer_email: 'customer@example.com',
    shipping_details: {
      name: 'Test Customer',
      address: {
        line1: '123 Test St',
        line2: null,
        city: 'Sydney',
        state: 'NSW',
        postal_code: '2000',
        country: 'AU',
      },
    },
    amount_total: 12000,
    total_details: {
      amount_shipping: 1000,
      amount_tax: 0,
      amount_discount: 0,
    },
    currency: 'aud',
    payment_intent: 'pi_test_123',
    metadata: {
      tenantId: 'tenant-123',
      items: JSON.stringify([
        { pieceId: 'piece-456', price: 99.99, quantity: 1 },
      ]),
      reservationSessionId: 'res_123',
      customerName: 'Test Customer',
      ...metadataOverrides,
    },
    ...sessionOverrides,
  } as unknown as Stripe.Checkout.Session

  return {
    id: 'evt_test_checkout_123',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: session },
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: '2023-10-16',
  } as unknown as Stripe.Event
}

function createPaymentIntentFailedEvent(
  metadataOverrides: Record<string, string> = {},
): Stripe.Event {
  const paymentIntent: Stripe.PaymentIntent = {
    id: 'pi_failed_123',
    object: 'payment_intent',
    amount: 12000,
    currency: 'aud',
    status: 'requires_payment_method',
    metadata: {
      reservationSessionId: 'res_failed_123',
      ...metadataOverrides,
    },
  } as unknown as Stripe.PaymentIntent

  return {
    id: 'evt_test_pi_failed_123',
    object: 'event',
    type: 'payment_intent.payment_failed',
    data: { object: paymentIntent },
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: '2023-10-16',
  } as unknown as Stripe.Event
}

function createCheckoutSessionExpiredEvent(
  metadataOverrides: Record<string, string> = {},
): Stripe.Event {
  const session: Stripe.Checkout.Session = {
    id: 'cs_expired_123',
    object: 'checkout.session',
    status: 'expired',
    metadata: {
      tenantId: 'tenant-123',
      reservationSessionId: 'res_expired_123',
      ...metadataOverrides,
    },
  } as unknown as Stripe.Checkout.Session

  return {
    id: 'evt_test_expired_123',
    object: 'event',
    type: 'checkout.session.expired',
    data: { object: session },
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: '2023-10-16',
  } as unknown as Stripe.Event
}

function createSubscriptionEvent(
  type:
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted',
  subscriptionOverrides: Partial<Stripe.Subscription> = {},
  metadataOverrides: Record<string, string> = {},
): Stripe.Event {
  const subscription: Stripe.Subscription = {
    id: 'sub_test_123',
    object: 'subscription',
    status: 'active',
    customer: 'cus_123',
    items: {
      object: 'list',
      data: [
        {
          id: 'si_123',
          price: {
            id: 'price_professional_monthly',
            product: { id: 'prod_123', name: 'Professional' } as Stripe.Product,
            nickname: 'Professional Monthly',
          } as Stripe.Price,
        },
      ],
    } as Stripe.ApiList<Stripe.SubscriptionItem>,
    metadata: {
      tenantId: 'tenant-123',
      ...metadataOverrides,
    },
    ...subscriptionOverrides,
  } as unknown as Stripe.Subscription

  return {
    id: `evt_test_sub_${type}_123`,
    object: 'event',
    type,
    data: { object: subscription },
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: '2023-10-16',
  } as unknown as Stripe.Event
}

function createInvoicePaymentFailedEvent(
  invoiceOverrides: Partial<Stripe.Invoice> = {},
): Stripe.Event {
  const invoice: Stripe.Invoice = {
    id: 'in_failed_123',
    object: 'invoice',
    amount_due: 2900,
    currency: 'aud',
    customer: 'cus_123',
    attempt_count: 1,
    ...invoiceOverrides,
  } as unknown as Stripe.Invoice

  return {
    id: 'evt_test_invoice_failed_123',
    object: 'event',
    type: 'invoice.payment_failed',
    data: { object: invoice },
    created: Date.now() / 1000,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: '2023-10-16',
  } as unknown as Stripe.Event
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTenant = {
  id: 'tenant-123',
  slug: 'test-shop',
  email: 'seller@example.com',
  businessName: 'Test Shop',
  plan: 'maker' as const,
  features: {},
}

const mockPiece = {
  id: 'piece-456',
  tenantId: 'tenant-123',
  name: 'Silver Ring',
  price: 99.99,
  status: 'available',
  category: 'Jewelry',
  description: 'A beautiful silver ring',
  digital: undefined,
}

const mockOrder = {
  id: 'order-789',
  tenantId: 'tenant-123',
  orderNumber: 'ORD-TEST123',
  customerEmail: 'customer@example.com',
  customerName: 'Test Customer',
  items: [
    {
      pieceId: 'piece-456',
      name: 'Silver Ring',
      price: 99.99,
      quantity: 1,
      category: 'Jewelry',
    },
  ],
  subtotal: 99.99,
  shipping: 10,
  tax: 0,
  discount: 0,
  total: 109.99,
  currency: 'AUD',
  shippingAddress: {
    line1: '123 Test St',
    line2: '',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'AU',
  },
  status: 'pending',
  paymentStatus: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// =============================================================================
// TESTS
// =============================================================================

describe('Stripe Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockConstructEvent.mockImplementation((body, _sig, _secret) => {
      return JSON.parse(body)
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Test 1: checkout.session.completed - Creates order, updates stock, sends email
  // ---------------------------------------------------------------------------
  describe('checkout.session.completed', () => {
    it('should create order, update stock, and send confirmation email', async () => {
      const event = createCheckoutSessionEvent()

      // Setup mocks
      vi.mocked(orders.getOrderByStripeSessionId).mockResolvedValue(null)
      vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)
      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
      vi.mocked(orders.createOrder).mockResolvedValue(mockOrder as any)
      vi.mocked(stockReservations.completeReservation).mockResolvedValue(true)
      vi.mocked(pieces.getLowStockPieces).mockResolvedValue([])
      vi.mocked(transactions.createTransaction).mockResolvedValue({
        id: 'txn_123',
      } as any)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      // Verify response
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify idempotency check
      expect(orders.getOrderByStripeSessionId).toHaveBeenCalledWith(
        'tenant-123',
        'cs_test_123',
      )

      // Verify stock reservation completed
      expect(stockReservations.completeReservation).toHaveBeenCalledWith(
        'res_123',
      )

      // Verify order created
      expect(orders.createOrder).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          customerEmail: 'customer@example.com',
          items: expect.arrayContaining([
            expect.objectContaining({
              pieceId: 'piece-456',
              name: 'Silver Ring',
            }),
          ]),
        }),
        expect.objectContaining({
          stripeSessionId: 'cs_test_123',
        }),
      )

      // Verify transaction recorded
      expect(transactions.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          orderId: 'order-789',
          type: 'sale',
          platformFee: 0, // Zero platform fee - MadeBuy differentiator
        }),
      )

      // Verify confirmation email sent
      expect(mockSendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-789' }),
        expect.objectContaining({ id: 'tenant-123' }),
      )
    })

    // -------------------------------------------------------------------------
    // Test 2: Idempotency - duplicate events ignored
    // -------------------------------------------------------------------------
    it('should skip duplicate orders (idempotency)', async () => {
      const event = createCheckoutSessionEvent()

      // Return existing order - simulate duplicate webhook
      vi.mocked(orders.getOrderByStripeSessionId).mockResolvedValue(
        mockOrder as any,
      )

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      // Should still return 200 (idempotent)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Should NOT create a new order
      expect(orders.createOrder).not.toHaveBeenCalled()
      expect(stockReservations.completeReservation).not.toHaveBeenCalled()
      expect(transactions.createTransaction).not.toHaveBeenCalled()
      expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Test 3: payment_intent.payment_failed - Cancels stock reservations
  // ---------------------------------------------------------------------------
  describe('payment_intent.payment_failed', () => {
    it('should cancel stock reservations on payment failure', async () => {
      const event = createPaymentIntentFailedEvent()

      vi.mocked(stockReservations.cancelReservation).mockResolvedValue(true)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify reservation was cancelled
      expect(stockReservations.cancelReservation).toHaveBeenCalledWith(
        'res_failed_123',
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Test 4: checkout.session.expired - Releases reservations
  // ---------------------------------------------------------------------------
  describe('checkout.session.expired', () => {
    it('should release stock reservations when checkout expires', async () => {
      const event = createCheckoutSessionExpiredEvent()

      vi.mocked(stockReservations.cancelReservation).mockResolvedValue(true)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify reservation was released
      expect(stockReservations.cancelReservation).toHaveBeenCalledWith(
        'res_expired_123',
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Test 5: customer.subscription.created - Updates tenant plan
  // ---------------------------------------------------------------------------
  describe('customer.subscription.created', () => {
    it('should update tenant plan on subscription creation', async () => {
      const event = createSubscriptionEvent('customer.subscription.created')

      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify tenant was updated with new plan and features
      expect(tenants.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          plan: expect.any(String), // Will be 'free' because price ID doesn't match env
          subscriptionId: 'sub_test_123',
          subscriptionStatus: 'active',
          features: expect.any(Object),
        }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Test 6: customer.subscription.deleted - Downgrades to free
  // ---------------------------------------------------------------------------
  describe('customer.subscription.deleted', () => {
    it('should downgrade tenant to free plan on subscription deletion', async () => {
      const event = createSubscriptionEvent('customer.subscription.deleted', {
        status: 'canceled',
      })

      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
      vi.mocked(tenants.updateTenant).mockResolvedValue(undefined)

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify tenant was downgraded to free
      expect(tenants.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          plan: 'free',
          subscriptionId: undefined,
          subscriptionStatus: 'cancelled',
        }),
      )

      // Verify cancellation email was sent
      expect(mockSendSubscriptionCancelledEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: expect.objectContaining({
            email: 'seller@example.com',
          }),
          planName: expect.any(String),
        }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Test 7: invoice.payment_failed - Sends notification email
  // ---------------------------------------------------------------------------
  describe('invoice.payment_failed', () => {
    it('should send payment failed notification email', async () => {
      const event = createInvoicePaymentFailedEvent()

      vi.mocked(tenants.getTenantByStripeCustomerId).mockResolvedValue(
        mockTenant as any,
      )

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Verify tenant lookup by Stripe customer ID
      expect(tenants.getTenantByStripeCustomerId).toHaveBeenCalledWith(
        'cus_123',
      )

      // Verify payment failed email was sent
      expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: expect.objectContaining({
            id: 'tenant-123',
          }),
          invoice: expect.objectContaining({
            id: 'in_failed_123',
          }),
          attemptCount: 1,
          nextRetryDate: expect.any(Date),
        }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Test 8: Invalid signature - Returns 400
  // ---------------------------------------------------------------------------
  describe('signature verification', () => {
    it('should reject requests with invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest('{}', 'invalid_signature')
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'Invalid signature' })
    })

    it('should reject requests with missing signature', async () => {
      const request = {
        text: () => Promise.resolve('{}'),
        headers: {
          get: () => null, // No signature header
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'No signature' })
    })
  })

  // ---------------------------------------------------------------------------
  // Test 9: Missing tenantId in metadata - Logs error, returns 200
  // ---------------------------------------------------------------------------
  describe('missing tenantId', () => {
    it('should log error but return 200 when tenantId is missing from checkout session', async () => {
      // Create event WITHOUT tenantId in metadata
      const event = createCheckoutSessionEvent({}, { tenantId: '' })
      // Remove the tenantId entirely
      ;(event.data.object as Stripe.Checkout.Session).metadata = {
        items: JSON.stringify([
          { pieceId: 'piece-456', price: 99.99, quantity: 1 },
        ]),
      }

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      // Should return 200 (webhook received successfully, even if we can't process)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Should log the error via pino logger
      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'cs_test_123' }),
        'No tenantId in checkout session metadata',
      )

      // Should NOT attempt to create order without tenantId
      expect(orders.createOrder).not.toHaveBeenCalled()
    })

    it('should log error but return 200 when tenantId is missing from subscription', async () => {
      const event = createSubscriptionEvent(
        'customer.subscription.created',
        {},
        {},
      )
      // Remove tenantId from metadata
      ;(event.data.object as Stripe.Subscription).metadata = {}

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const request = createMockRequest(JSON.stringify(event))
      const response = await POST(request)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ received: true })

      // Should log the error via console.error (subscription handler uses console.error)
      expect(consoleSpy).toHaveBeenCalledWith(
        'No tenantId in subscription metadata',
      )
      expect(tenants.updateTenant).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
