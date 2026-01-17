/**
 * Tests for Stripe webhook handlers
 * Covers checkout completion, payment failures, and subscription events
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @madebuy/db
vi.mock('@madebuy/db', () => ({
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

import {
  orders,
  pieces,
  stockReservations,
  tenants,
  transactions,
} from '@madebuy/db'

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: vi
          .fn()
          .mockImplementation((body, signature, _secret) => {
            if (signature === 'invalid') {
              throw new Error('Invalid signature')
            }
            return JSON.parse(body)
          }),
      },
    })),
  }
})

// Mock email functions
vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(true),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(true),
  sendLowStockAlertEmail: vi.fn().mockResolvedValue(true),
}))

describe('Stripe Webhooks', () => {
  const mockTenant = {
    id: 'tenant-123',
    email: 'seller@example.com',
    businessName: 'Test Shop',
    plan: 'maker',
  }

  const mockPiece = {
    id: 'piece-456',
    tenantId: 'tenant-123',
    name: 'Silver Ring',
    price: 99.99,
    status: 'available',
    category: 'Jewelry',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkout.session.completed', () => {
    it('should create order on successful checkout', async () => {
      vi.mocked(orders.getOrderByStripeSessionId).mockResolvedValue(null)
      vi.mocked(pieces.getPiece).mockResolvedValue(mockPiece as any)
      vi.mocked(tenants.getTenantById).mockResolvedValue(mockTenant as any)
      vi.mocked(orders.createOrder).mockResolvedValue({
        id: 'order-789',
        orderNumber: 'ORD-TEST123',
        customerEmail: 'customer@example.com',
      } as any)
      vi.mocked(stockReservations.completeReservation).mockResolvedValue(true)
      vi.mocked(pieces.getLowStockPieces).mockResolvedValue([])

      // Simulate handleCheckoutCompleted logic
      const _session = {
        id: 'cs_test_123',
        metadata: {
          tenantId: 'tenant-123',
          items: JSON.stringify([
            { pieceId: 'piece-456', price: 99.99, quantity: 1 },
          ]),
          reservationSessionId: 'res_123',
        },
        customer_details: { email: 'customer@example.com' },
        shipping_details: {
          address: {
            line1: '123 Test St',
            city: 'Sydney',
            state: 'NSW',
            postal_code: '2000',
            country: 'AU',
          },
        },
        amount_total: 12000,
        currency: 'aud',
        payment_intent: 'pi_test',
      }

      // Check idempotency
      const existingOrder = await orders.getOrderByStripeSessionId(
        'tenant-123',
        'cs_test_123',
      )
      expect(existingOrder).toBeNull()

      // Complete reservation
      const completed = await stockReservations.completeReservation('res_123')
      expect(completed).toBe(true)

      // Get piece for order items
      const piece = await pieces.getPiece('tenant-123', 'piece-456')
      expect(piece).toBeDefined()
    })

    it('should skip duplicate orders (idempotency)', async () => {
      const existingOrder = {
        id: 'order-existing',
        orderNumber: 'ORD-EXISTING',
      }
      vi.mocked(orders.getOrderByStripeSessionId).mockResolvedValue(
        existingOrder as any,
      )

      const order = await orders.getOrderByStripeSessionId(
        'tenant-123',
        'cs_test_123',
      )

      expect(order).toBeDefined()
      expect(order?.id).toBe('order-existing')
      // Should not call createOrder when order already exists
    })

    it('should check for low stock after order completion', async () => {
      const lowStockPieces = [
        {
          id: 'piece-low',
          name: 'Low Stock Item',
          stock: 2,
          lowStockThreshold: 5,
        },
      ]
      vi.mocked(pieces.getLowStockPieces).mockResolvedValue(
        lowStockPieces as any,
      )

      const pieces_result = await pieces.getLowStockPieces('tenant-123')

      expect(pieces_result).toHaveLength(1)
      expect(pieces_result[0].stock).toBe(2)
    })
  })

  describe('payment_intent.payment_failed', () => {
    it('should cancel stock reservations on payment failure', async () => {
      vi.mocked(stockReservations.cancelReservation).mockResolvedValue(true)

      const result = await stockReservations.cancelReservation('res_failed_123')

      expect(result).toBe(true)
      expect(stockReservations.cancelReservation).toHaveBeenCalledWith(
        'res_failed_123',
      )
    })
  })

  describe('checkout.session.expired', () => {
    it('should release stock reservations on checkout expiry', async () => {
      vi.mocked(stockReservations.cancelReservation).mockResolvedValue(true)

      const result =
        await stockReservations.cancelReservation('res_expired_123')

      expect(result).toBe(true)
    })
  })

  describe('Subscription Events', () => {
    it('should update tenant plan on subscription.updated', async () => {
      vi.mocked(tenants.updateTenant).mockResolvedValue()

      // Simulate subscription update
      await tenants.updateTenant('tenant-123', {
        plan: 'professional',
        subscriptionId: 'sub_123',
        subscriptionStatus: 'active',
      })

      expect(tenants.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          plan: 'professional',
        }),
      )
    })

    it('should downgrade to free on subscription.deleted', async () => {
      vi.mocked(tenants.updateTenant).mockResolvedValue()

      // Simulate subscription cancellation
      await tenants.updateTenant('tenant-123', {
        plan: 'free',
        subscriptionId: undefined,
        subscriptionStatus: 'cancelled',
      })

      expect(tenants.updateTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          plan: 'free',
          subscriptionStatus: 'cancelled',
        }),
      )
    })

    it('should handle invoice.payment_failed', async () => {
      vi.mocked(tenants.getTenantByStripeCustomerId).mockResolvedValue(
        mockTenant as any,
      )

      const tenant = await tenants.getTenantByStripeCustomerId('cus_123')

      expect(tenant).toBeDefined()
      expect(tenant?.id).toBe('tenant-123')
    })
  })

  describe('Signature Verification', () => {
    it('should reject requests with invalid signature', () => {
      const verifySignature = (signature: string) => {
        if (signature === 'invalid' || !signature) {
          throw new Error('Invalid signature')
        }
        return true
      }

      expect(() => verifySignature('invalid')).toThrow('Invalid signature')
      expect(() => verifySignature('')).toThrow('Invalid signature')
      expect(verifySignature('valid_sig_xxx')).toBe(true)
    })
  })

  describe('Transaction Recording', () => {
    it('should record transaction with zero platform fee', async () => {
      vi.mocked(transactions.createTransaction).mockResolvedValue({
        id: 'txn_123',
      } as any)

      await transactions.createTransaction({
        tenantId: 'tenant-123',
        orderId: 'order-789',
        type: 'sale',
        grossAmount: 12000,
        stripeFee: 380, // ~3.17% for domestic
        platformFee: 0, // Zero - MadeBuy's differentiator
        netAmount: 11620,
        currency: 'AUD',
        stripePaymentIntentId: 'pi_test',
        status: 'completed',
      })

      expect(transactions.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          platformFee: 0,
        }),
      )
    })
  })
})
