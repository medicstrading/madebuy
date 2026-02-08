import { orders } from '@madebuy/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_TENANT_FREE,
  createRequest,
  mockCurrentTenant,
  mockUnauthorized,
} from '../../../__tests__/setup'

// Import handler (mocks from setup.ts are already active)
import { POST as createPOSOrder } from '../pos/route'

describe('POS API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/pos', () => {
    it('returns 401 when unauthorized', async () => {
      mockUnauthorized()

      const req = createRequest('/api/pos', {
        method: 'POST',
        body: {
          items: [{ pieceId: 'p1', name: 'Test', price: 1000, quantity: 1, category: 'test' }],
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          paymentMethod: 'cash',
          subtotal: 1000,
        },
      })
      const res = await createPOSOrder(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('Please log in to continue.')
    })

    it('returns 400 when no items provided', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const req = createRequest('/api/pos', {
        method: 'POST',
        body: {
          items: [],
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          paymentMethod: 'cash',
          subtotal: 0,
        },
      })
      const res = await createPOSOrder(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ error: 'No items provided' })
    })

    it('creates POS order successfully with cash payment', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockOrder = {
        id: 'order-1',
        orderNumber: 'MB-1001',
        tenantId: MOCK_TENANT_FREE.id,
        total: 1000,
      }
      vi.mocked(orders.createOrder).mockResolvedValue(mockOrder as any)
      vi.mocked(orders.updateOrderPaymentStatus).mockResolvedValue(undefined)
      vi.mocked(orders.updateOrderStatus).mockResolvedValue(undefined)

      const req = createRequest('/api/pos', {
        method: 'POST',
        body: {
          items: [
            {
              pieceId: 'p1',
              name: 'Handmade Mug',
              price: 1000,
              quantity: 1,
              category: 'pottery',
            },
          ],
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '0400123456',
          paymentMethod: 'cash',
          subtotal: 1000,
        },
      })
      const res = await createPOSOrder(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toEqual({
        success: true,
        orderId: 'order-1',
        orderNumber: 'MB-1001',
      })
      expect(orders.createOrder).toHaveBeenCalledWith(
        MOCK_TENANT_FREE.id,
        expect.objectContaining({
          customerEmail: 'john@example.com',
          customerName: 'John Doe',
          shippingMethod: 'local_pickup',
        }),
        expect.objectContaining({
          shipping: 0,
          tax: 0,
          discount: 0,
        }),
      )
      expect(orders.updateOrderPaymentStatus).toHaveBeenCalledWith(
        MOCK_TENANT_FREE.id,
        'order-1',
        'paid',
      )
      expect(orders.updateOrderStatus).toHaveBeenCalledWith(
        MOCK_TENANT_FREE.id,
        'order-1',
        'confirmed',
      )
    })

    it('creates POS order successfully with card payment', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockOrder = {
        id: 'order-2',
        orderNumber: 'MB-1002',
        tenantId: MOCK_TENANT_FREE.id,
        total: 2500,
      }
      vi.mocked(orders.createOrder).mockResolvedValue(mockOrder as any)
      vi.mocked(orders.updateOrderPaymentStatus).mockResolvedValue(undefined)
      vi.mocked(orders.updateOrderStatus).mockResolvedValue(undefined)

      const req = createRequest('/api/pos', {
        method: 'POST',
        body: {
          items: [
            {
              pieceId: 'p2',
              name: 'Ceramic Bowl',
              price: 2500,
              quantity: 1,
              category: 'pottery',
            },
          ],
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          paymentMethod: 'card_manual',
          subtotal: 2500,
        },
      })
      const res = await createPOSOrder(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data).toMatchObject({
        success: true,
        orderId: 'order-2',
        orderNumber: 'MB-1002',
      })
    })

    it('converts variant options correctly', async () => {
      mockCurrentTenant(MOCK_TENANT_FREE)

      const mockOrder = {
        id: 'order-3',
        orderNumber: 'MB-1003',
        total: 1500,
      }
      vi.mocked(orders.createOrder).mockResolvedValue(mockOrder as any)
      vi.mocked(orders.updateOrderPaymentStatus).mockResolvedValue(undefined)
      vi.mocked(orders.updateOrderStatus).mockResolvedValue(undefined)

      const req = createRequest('/api/pos', {
        method: 'POST',
        body: {
          items: [
            {
              pieceId: 'p3',
              name: 'T-Shirt',
              price: 1500,
              quantity: 1,
              category: 'clothing',
              variantId: 'v1',
              variantOptions: { size: 'M', color: 'Blue' },
            },
          ],
          customerName: 'Bob Brown',
          customerEmail: 'bob@example.com',
          paymentMethod: 'cash',
          subtotal: 1500,
        },
      })
      const res = await createPOSOrder(req)

      expect(res.status).toBe(201)
      expect(orders.createOrder).toHaveBeenCalledWith(
        MOCK_TENANT_FREE.id,
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              variantId: 'v1',
              variantAttributes: { size: 'M', color: 'Blue' },
            }),
          ]),
        }),
        expect.any(Object),
      )
    })
  })
})
