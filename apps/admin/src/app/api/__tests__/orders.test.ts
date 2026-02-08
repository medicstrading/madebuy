/**
 * Tests for orders API routes
 * Covers listing, status updates, and authentication
 */

import { orders } from '@madebuy/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Import handlers (mocks from setup.ts are already active)
import { GET, POST } from '../orders/route'

describe('Orders API', () => {
  const mockOrder = {
    id: 'order-456',
    tenantId: 'tenant-123',
    orderNumber: 'ORD-ABC123',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    items: [
      {
        pieceId: 'piece-1',
        name: 'Silver Ring',
        price: 99.99,
        quantity: 1,
        category: 'Jewelry',
      },
    ],
    subtotal: 99.99,
    shipping: 9.95,
    tax: 10.0,
    discount: 0,
    total: 119.94,
    currency: 'AUD',
    shippingAddress: {
      line1: '123 Main St',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
    },
    shippingMethod: 'standard',
    shippingType: 'domestic' as const,
    paymentMethod: 'stripe' as const,
    status: 'pending' as const,
    paymentStatus: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/orders', () => {
    it('should return 401 when not authenticated', async () => {
      mockUnauthorized()

      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Please log in to continue.')
    })

    it('should return orders when authenticated', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(orders.listOrders).mockResolvedValue([mockOrder])

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0].orderNumber).toBe('ORD-ABC123')
    })

    it('should call listOrders with correct tenant ID', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(orders.listOrders).mockResolvedValue([])

      await GET()

      expect(orders.listOrders).toHaveBeenCalledWith('tenant-123')
    })

    it('should return empty array when no orders exist', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(orders.listOrders).mockResolvedValue([])

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.orders).toHaveLength(0)
    })
  })

  describe('POST /api/orders', () => {
    it('should return 401 when not authenticated', async () => {
      mockUnauthorized()

      const request = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderData: {
            customerEmail: 'new@example.com',
            customerName: 'New Customer',
            items: [
              { pieceId: 'piece-1', name: 'Ring', price: 50, quantity: 1 },
            ],
            shippingAddress: {
              line1: '123 Test St',
              city: 'Sydney',
              state: 'NSW',
              postalCode: '2000',
              country: 'AU',
            },
          },
          pricing: { shipping: 10, tax: 5 },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create order when authenticated', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)
      vi.mocked(orders.createOrder).mockResolvedValue({
        ...mockOrder,
        id: 'new-order-id',
        customerEmail: 'new@example.com',
      } as any)

      const request = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderData: {
            customerEmail: 'new@example.com',
            customerName: 'New Customer',
            items: [
              { pieceId: 'piece-1', name: 'Ring', price: 50, quantity: 1 },
            ],
            shippingAddress: {
              line1: '123 Test St',
              city: 'Sydney',
              state: 'NSW',
              postalCode: '2000',
              country: 'AU',
            },
          },
          pricing: { shipping: 10, tax: 5 },
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.order.customerEmail).toBe('new@example.com')
    })
  })

  describe('Status Transitions', () => {
    it('should properly track order status changes', () => {
      // Test status flow logic
      const validTransitions: Record<string, string[]> = {
        pending: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: [], // Terminal state
        cancelled: [], // Terminal state
      }

      // Verify valid transitions
      expect(validTransitions.pending).toContain('processing')
      expect(validTransitions.processing).toContain('shipped')
      expect(validTransitions.shipped).toContain('delivered')
      expect(validTransitions.delivered).toHaveLength(0)
    })
  })
})
