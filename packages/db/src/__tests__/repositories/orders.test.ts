/**
 * Tests for orders repository
 * Covers order creation, status transitions, and idempotency
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { seedMockCollection, getMockCollectionData } from '../setup'
import * as orders from '../../repositories/orders'

describe('Orders Repository', () => {
  const tenantId = 'tenant-123'

  const mockOrderData = {
    id: 'order-456',
    tenantId,
    orderNumber: 'ORD-ABC123-XYZ',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    customerPhone: '+61400000000',
    items: [
      {
        pieceId: 'piece-1',
        name: 'Silver Ring',
        price: 99.99,
        quantity: 2,
        category: 'Jewelry',
      },
    ],
    subtotal: 199.98,
    shipping: 9.95,
    tax: 20.00,
    discount: 0,
    total: 229.93,
    currency: 'AUD',
    shippingAddress: {
      line1: '123 Test St',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
    },
    shippingMethod: 'standard',
    shippingType: 'domestic' as const,
    paymentMethod: 'stripe' as const,
    paymentStatus: 'pending' as const,
    status: 'pending' as const,
    stripeSessionId: 'cs_test_123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('createOrder', () => {
    it('should create a new order with calculated totals', async () => {
      const order = await orders.createOrder(
        tenantId,
        {
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          items: [
            { pieceId: 'piece-1', name: 'Ring', price: 100, quantity: 2, category: 'Jewelry' },
          ],
          shippingAddress: {
            line1: '456 Test Ave',
            city: 'Melbourne',
            state: 'VIC',
            postcode: '3000',
            country: 'AU',
          },
          shippingMethod: 'standard',
          shippingType: 'domestic',
        },
        { shipping: 10, tax: 20, discount: 5 }
      )

      expect(order).toBeDefined()
      expect(order.id).toBeDefined()
      expect(order.orderNumber).toMatch(/^ORD-/)
      expect(order.customerEmail).toBe('test@example.com')
      expect(order.subtotal).toBe(200) // 100 * 2
      expect(order.total).toBe(225) // 200 + 10 + 20 - 5
      expect(order.status).toBe('pending')
      expect(order.paymentStatus).toBe('pending')
    })

    it('should generate unique order numbers', async () => {
      const order1 = await orders.createOrder(
        tenantId,
        {
          customerEmail: 'test1@example.com',
          customerName: 'Test 1',
          items: [{ pieceId: 'piece-1', name: 'Item', price: 50, quantity: 1, category: 'General' }],
          shippingAddress: {
            line1: '1 Test St',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            country: 'AU',
          },
          shippingMethod: 'standard',
          shippingType: 'domestic',
        },
        { shipping: 5, tax: 5 }
      )

      const order2 = await orders.createOrder(
        tenantId,
        {
          customerEmail: 'test2@example.com',
          customerName: 'Test 2',
          items: [{ pieceId: 'piece-2', name: 'Item', price: 60, quantity: 1, category: 'General' }],
          shippingAddress: {
            line1: '2 Test St',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            country: 'AU',
          },
          shippingMethod: 'standard',
          shippingType: 'domestic',
        },
        { shipping: 5, tax: 6 }
      )

      expect(order1.orderNumber).not.toBe(order2.orderNumber)
    })

    it('should store Stripe session ID for idempotency', async () => {
      const order = await orders.createOrder(
        tenantId,
        {
          customerEmail: 'test@example.com',
          customerName: 'Test',
          items: [{ pieceId: 'piece-1', name: 'Item', price: 100, quantity: 1, category: 'General' }],
          shippingAddress: {
            line1: '1 Test St',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
            country: 'AU',
          },
          shippingMethod: 'standard',
          shippingType: 'domestic',
        },
        { shipping: 10, tax: 10, stripeSessionId: 'cs_test_unique_123' }
      )

      expect(order.stripeSessionId).toBe('cs_test_unique_123')
    })
  })

  describe('getOrder', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should return order when found', async () => {
      const order = await orders.getOrder(tenantId, 'order-456')

      expect(order).toBeDefined()
      expect(order?.id).toBe('order-456')
      expect(order?.customerEmail).toBe('customer@example.com')
    })

    it('should return null when order not found', async () => {
      const order = await orders.getOrder(tenantId, 'non-existent')

      expect(order).toBeNull()
    })

    it('should not return order from different tenant', async () => {
      const order = await orders.getOrder('other-tenant', 'order-456')

      expect(order).toBeNull()
    })
  })

  describe('getOrderByNumber', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should return order by order number', async () => {
      const order = await orders.getOrderByNumber(tenantId, 'ORD-ABC123-XYZ')

      expect(order).toBeDefined()
      expect(order?.orderNumber).toBe('ORD-ABC123-XYZ')
    })
  })

  describe('getOrderByStripeSessionId (Idempotency)', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should return order by Stripe session ID', async () => {
      const order = await orders.getOrderByStripeSessionId(tenantId, 'cs_test_123')

      expect(order).toBeDefined()
      expect(order?.stripeSessionId).toBe('cs_test_123')
    })

    it('should return null for unknown session ID', async () => {
      const order = await orders.getOrderByStripeSessionId(tenantId, 'cs_unknown')

      expect(order).toBeNull()
    })
  })

  describe('listOrders', () => {
    beforeEach(() => {
      seedMockCollection('orders', [
        mockOrderData,
        { ...mockOrderData, id: 'order-2', orderNumber: 'ORD-2', status: 'processing' },
        { ...mockOrderData, id: 'order-3', orderNumber: 'ORD-3', status: 'shipped', paymentStatus: 'paid' },
        { ...mockOrderData, id: 'order-4', orderNumber: 'ORD-4', customerEmail: 'other@example.com' },
      ])
    })

    it('should list all orders for tenant', async () => {
      const list = await orders.listOrders(tenantId)

      expect(list).toHaveLength(4)
    })

    it('should filter by status', async () => {
      const list = await orders.listOrders(tenantId, { status: 'pending' })

      expect(list).toHaveLength(2)
    })

    it('should filter by payment status', async () => {
      const list = await orders.listOrders(tenantId, { paymentStatus: 'paid' })

      expect(list).toHaveLength(1)
    })

    it('should filter by customer email', async () => {
      const list = await orders.listOrders(tenantId, { customerEmail: 'customer@example.com' })

      expect(list).toHaveLength(3)
    })

    it('should apply pagination', async () => {
      const list = await orders.listOrders(tenantId, { limit: 2, offset: 0 })

      expect(list).toHaveLength(2)
    })
  })

  describe('Status Transitions', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should update order status', async () => {
      await orders.updateOrderStatus(tenantId, 'order-456', 'processing')

      const data = getMockCollectionData('orders')
      const updated = data.find(o => o.id === 'order-456')

      expect(updated?.status).toBe('processing')
      expect(updated?.updatedAt).toBeInstanceOf(Date)
    })

    it('should update payment status', async () => {
      await orders.updateOrderPaymentStatus(tenantId, 'order-456', 'paid')

      const data = getMockCollectionData('orders')
      const updated = data.find(o => o.id === 'order-456')

      expect(updated?.paymentStatus).toBe('paid')
    })

    it('should allow full status flow: pending -> processing -> shipped -> delivered', async () => {
      await orders.updateOrderStatus(tenantId, 'order-456', 'processing')
      let data = getMockCollectionData('orders')
      expect(data.find(o => o.id === 'order-456')?.status).toBe('processing')

      await orders.updateOrderStatus(tenantId, 'order-456', 'shipped')
      data = getMockCollectionData('orders')
      expect(data.find(o => o.id === 'order-456')?.status).toBe('shipped')

      await orders.updateOrderStatus(tenantId, 'order-456', 'delivered')
      data = getMockCollectionData('orders')
      expect(data.find(o => o.id === 'order-456')?.status).toBe('delivered')
    })
  })

  describe('updateOrder', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should update multiple order fields', async () => {
      await orders.updateOrder(tenantId, 'order-456', {
        customerNotes: 'Please gift wrap',
        trackingNumber: 'TRACK123',
      })

      const data = getMockCollectionData('orders')
      const updated = data.find(o => o.id === 'order-456')

      expect(updated?.customerNotes).toBe('Please gift wrap')
      expect(updated?.trackingNumber).toBe('TRACK123')
    })
  })

  describe('deleteOrder', () => {
    beforeEach(() => {
      seedMockCollection('orders', [mockOrderData])
    })

    it('should delete order', async () => {
      await orders.deleteOrder(tenantId, 'order-456')

      const data = getMockCollectionData('orders')
      expect(data).toHaveLength(0)
    })
  })

  describe('countOrders', () => {
    beforeEach(() => {
      seedMockCollection('orders', [
        mockOrderData,
        { ...mockOrderData, id: 'order-2', orderNumber: 'ORD-2' },
        { ...mockOrderData, id: 'order-3', orderNumber: 'ORD-3' },
      ])
    })

    it('should count orders for tenant', async () => {
      const count = await orders.countOrders(tenantId)

      expect(count).toBe(3)
    })
  })

  describe('getOrderStats', () => {
    beforeEach(() => {
      seedMockCollection('orders', [
        { ...mockOrderData, status: 'pending' },
        { ...mockOrderData, id: 'order-2', orderNumber: 'ORD-2', status: 'pending' },
        { ...mockOrderData, id: 'order-3', orderNumber: 'ORD-3', status: 'processing' },
        { ...mockOrderData, id: 'order-4', orderNumber: 'ORD-4', status: 'shipped' },
        { ...mockOrderData, id: 'order-5', orderNumber: 'ORD-5', status: 'delivered' },
        { ...mockOrderData, id: 'order-6', orderNumber: 'ORD-6', status: 'delivered' },
      ])
    })

    it('should return order statistics by status', async () => {
      const stats = await orders.getOrderStats(tenantId)

      expect(stats.pending).toBe(2)
      expect(stats.processing).toBe(1)
      expect(stats.shipped).toBe(1)
      expect(stats.delivered).toBe(2)
      expect(stats.total).toBe(6)
    })
  })

  describe('Bulk Operations', () => {
    beforeEach(() => {
      seedMockCollection('orders', [
        { ...mockOrderData, id: 'order-1', orderNumber: 'ORD-1', status: 'pending' },
        { ...mockOrderData, id: 'order-2', orderNumber: 'ORD-2', status: 'pending' },
        { ...mockOrderData, id: 'order-3', orderNumber: 'ORD-3', status: 'pending' },
      ])
    })

    it('should bulk update order status', async () => {
      const count = await orders.bulkUpdateOrderStatus(
        tenantId,
        ['order-1', 'order-2'],
        'processing'
      )

      expect(count).toBe(2)

      const data = getMockCollectionData('orders')
      expect(data.find(o => o.id === 'order-1')?.status).toBe('processing')
      expect(data.find(o => o.id === 'order-2')?.status).toBe('processing')
      expect(data.find(o => o.id === 'order-3')?.status).toBe('pending')
    })

    it('should return 0 for empty array', async () => {
      const count = await orders.bulkUpdateOrderStatus(tenantId, [], 'processing')

      expect(count).toBe(0)
    })
  })

  describe('Review Requests', () => {
    beforeEach(() => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8)

      seedMockCollection('orders', [
        {
          ...mockOrderData,
          id: 'order-1',
          orderNumber: 'ORD-1',
          status: 'delivered',
          deliveredAt: sevenDaysAgo,
        },
        {
          ...mockOrderData,
          id: 'order-2',
          orderNumber: 'ORD-2',
          status: 'delivered',
          deliveredAt: sevenDaysAgo,
          reviewRequestSentAt: new Date(),
        },
        {
          ...mockOrderData,
          id: 'order-3',
          orderNumber: 'ORD-3',
          status: 'shipped',
        },
      ])
    })

    it('should mark review request as sent', async () => {
      await orders.markReviewRequestSent(tenantId, 'order-1')

      const data = getMockCollectionData('orders')
      const updated = data.find(o => o.id === 'order-1')

      expect(updated?.reviewRequestSentAt).toBeInstanceOf(Date)
    })
  })
})
