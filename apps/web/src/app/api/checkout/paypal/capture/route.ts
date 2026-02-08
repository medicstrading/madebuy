import { orders, pieces, stockReservations } from '@madebuy/db'
import type { OrderItem } from '@madebuy/shared'
import { createLogger, isMadeBuyError, toErrorResponse } from '@madebuy/shared'
import paypal from '@paypal/checkout-server-sdk'
import { type NextRequest, NextResponse } from 'next/server'
import { getPayPalClient, isPayPalEnabled } from '@/lib/paypal'
import { rateLimiters } from '@/lib/rate-limit'

const log = createLogger({ module: 'checkout-paypal-capture' })

interface PayPalCaptureResult {
  status: string
  purchase_units: Array<{
    amount: {
      value: string
      currency_code: string
      breakdown?: {
        item_total?: { value: string }
        shipping?: { value: string }
      }
    }
    items?: Array<{
      sku?: string
      unit_amount: { value: string }
      quantity: string
    }>
    shipping?: {
      name?: { full_name: string }
      address: {
        address_line_1?: string
        address_line_2?: string
        admin_area_1?: string
        admin_area_2?: string
        postal_code?: string
        country_code?: string
      }
    }
    payments?: {
      captures?: Array<{ id: string }>
    }
  }>
  payer: {
    email_address: string
    name?: {
      given_name?: string
      surname?: string
    }
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute
  const rateLimitResponse = await rateLimiters.checkout(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Check if PayPal is enabled
    if (!isPayPalEnabled()) {
      return NextResponse.json(
        {
          error: 'PayPal checkout is not configured',
          code: 'PAYPAL_NOT_CONFIGURED',
        },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { orderID, tenantId, reservationSessionId } = body

    if (!orderID || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    // Capture PayPal payment
    const client = getPayPalClient()
    if (!client) {
      return NextResponse.json(
        { error: 'PayPal is not configured', code: 'PAYPAL_NOT_CONFIGURED' },
        { status: 503 },
      )
    }

    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderID)
    captureRequest.requestBody({})

    let capture: PayPalCaptureResult
    try {
      const captureResponse = await client.execute<PayPalCaptureResult>(captureRequest)
      capture = captureResponse.result
    } catch (err: any) {
      log.error({ err, orderID, tenantId }, 'PayPal capture failed')

      // Release stock reservation on payment failure
      if (reservationSessionId) {
        await stockReservations.cancelReservation(reservationSessionId)
      }

      return NextResponse.json(
        {
          error: 'Payment capture failed',
          code: 'PAYMENT_FAILED',
          details: err.message,
        },
        { status: 400 },
      )
    }

    // Verify payment was successful
    if (capture.status !== 'COMPLETED') {
      log.warn(
        { orderID, status: capture.status, tenantId },
        'PayPal payment not completed',
      )

      // Release stock reservation
      if (reservationSessionId) {
        await stockReservations.cancelReservation(reservationSessionId)
      }

      return NextResponse.json(
        {
          error: 'Payment not completed',
          code: 'PAYMENT_INCOMPLETE',
          status: capture.status,
        },
        { status: 400 },
      )
    }

    // PAY-04: Check for duplicate order by PayPal order ID to prevent double-processing
    const existingOrderByPayPal = await orders.getOrderByPayPalOrderId(tenantId, orderID)
    if (existingOrderByPayPal) {
      log.info(
        { orderID, orderId: existingOrderByPayPal.id, tenantId },
        'Order already exists for this PayPal order ID, skipping duplicate',
      )
      return NextResponse.json({
        success: true,
        orderId: existingOrderByPayPal.id,
        orderNumber: existingOrderByPayPal.orderNumber,
      })
    }

    // Extract order details from PayPal response
    const purchaseUnit = capture.purchase_units[0]
    const payerInfo = capture.payer
    const shippingInfo = purchaseUnit.shipping
    const amount = purchaseUnit.amount

    // Build order items from PayPal items
    const orderItems: OrderItem[] = []
    for (const item of purchaseUnit.items || []) {
      const pieceId = item.sku || ''
      const piece = await pieces.getPiece(tenantId, pieceId)

      if (!piece) {
        log.warn({ pieceId, tenantId }, 'Piece not found for PayPal order item')
        continue
      }

      orderItems.push({
        pieceId: piece.id,
        name: piece.name,
        price: parseFloat(item.unit_amount.value) * 100, // Convert to cents
        quantity: parseInt(item.quantity, 10),
        imageUrl: piece.mediaIds?.[0]
          ? `/api/media/${piece.mediaIds[0]}/url`
          : undefined,
        description: piece.description,
        category: piece.category || 'uncategorized',
        isDigital: !!piece.digital,
      })
    }

    // Create order in database
    const subtotalCents =
      parseFloat(amount.breakdown?.item_total?.value || '0') * 100
    const shippingCents =
      parseFloat(amount.breakdown?.shipping?.value || '0') * 100
    const totalCents = parseFloat(amount.value) * 100

    const order = await orders.createOrder(
      tenantId,
      {
        customerEmail: payerInfo.email_address,
        customerName:
          shippingInfo?.name?.full_name ||
          `${payerInfo.name?.given_name || ''} ${payerInfo.name?.surname || ''}`.trim(),
        customerPhone: undefined,
        items: orderItems,
        shippingAddress: shippingInfo
          ? {
              line1: shippingInfo.address.address_line_1 || '',
              line2: shippingInfo.address.address_line_2,
              city: shippingInfo.address.admin_area_2 || '',
              state: shippingInfo.address.admin_area_1 || '',
              postcode: shippingInfo.address.postal_code || '',
              country: shippingInfo.address.country_code || '',
            }
          : {
              line1: '',
              city: '',
              state: '',
              postcode: '',
              country: '',
            },
        shippingMethod: shippingInfo ? 'Standard Shipping' : 'Digital Delivery',
        shippingType: shippingInfo ? 'domestic' : 'local_pickup',
      },
      {
        shipping: shippingCents,
        tax: 0, // Tax handled by PayPal
        discount: 0,
        currency: amount.currency_code,
        paymentMethod: 'paypal',
        paypalOrderId: orderID,
      },
    )

    // Update order payment status to paid
    await orders.updateOrder(tenantId, order.id, {
      paymentStatus: 'paid',
      status: 'confirmed',
      paidAt: new Date(),
      paypalCaptureId: purchaseUnit.payments?.captures?.[0]?.id,
    })

    // Confirm stock reservation (deducts from inventory)
    if (reservationSessionId) {
      await stockReservations.commitReservation(tenantId, reservationSessionId)
    }

    log.info(
      {
        tenantId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paypalOrderId: orderID,
        captureId: purchaseUnit.payments?.captures?.[0]?.id,
        total: totalCents,
      },
      'PayPal order captured and created',
    )

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json(
        { error: msg, code, details },
        { status: statusCode },
      )
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected PayPal capture error')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
