import { orders } from '@madebuy/db'
import type { OrderItem } from '@madebuy/shared'
import {
  createLogger,
  isMadeBuyError,
  toErrorResponse,
  UnauthorizedError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

const log = createLogger({ module: 'pos' })

interface POSOrderRequest {
  items: Array<{
    pieceId: string
    name: string
    price: number
    quantity: number
    category: string
    variantId?: string
    variantOptions?: Record<string, string>
  }>
  customerName: string
  customerEmail: string
  customerPhone?: string
  paymentMethod: 'cash' | 'card_manual'
  subtotal: number
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      throw new UnauthorizedError()
    }

    const body: POSOrderRequest = await request.json()

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    // Convert items to OrderItem format
    const orderItems: OrderItem[] = body.items.map((item) => ({
      pieceId: item.pieceId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      variantId: item.variantId,
      variantAttributes: item.variantOptions,
    }))

    // Create POS order (no shipping address needed for in-person sales)
    const order = await orders.createOrder(
      tenant.id,
      {
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        items: orderItems,
        // Local pickup - no shipping address needed
        shippingAddress: {
          line1: 'In-person sale',
          city: 'N/A',
          state: 'N/A',
          postcode: '0000',
          country: 'AU',
        },
        shippingMethod: 'local_pickup',
        shippingType: 'local_pickup',
      },
      {
        shipping: 0, // No shipping for POS
        tax: 0, // Tax already calculated in subtotal if needed
        discount: 0,
        currency: 'AUD',
        paymentMethod:
          body.paymentMethod === 'cash' ? 'bank_transfer' : 'stripe', // Use bank_transfer for cash
      },
    )

    // Immediately mark as paid since it's a POS transaction
    await orders.updateOrderPaymentStatus(tenant.id, order.id, 'paid')
    await orders.updateOrderStatus(tenant.id, order.id, 'confirmed')

    log.info(
      { orderId: order.id, orderNumber: order.orderNumber, tenant: tenant.id },
      'POS order created',
    )

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      { status: 201 },
    )
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json(
        { error: msg, code, details },
        { status: statusCode },
      )
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected error creating POS order')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
