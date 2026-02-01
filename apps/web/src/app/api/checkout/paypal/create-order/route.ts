import { media, pieces, stockReservations, tenants } from '@madebuy/db'
import type { ProductVariant } from '@madebuy/shared'
import {
  createLogger,
  InsufficientStockError,
  isMadeBuyError,
  NotFoundError,
  safeValidateCheckoutRequest,
  toErrorResponse,
  ValidationError,
} from '@madebuy/shared'
import paypal from '@paypal/checkout-server-sdk'
import { type NextRequest, NextResponse } from 'next/server'
import { getPayPalClient, isPayPalEnabled } from '@/lib/paypal'
import { rateLimiters } from '@/lib/rate-limit'

const log = createLogger({ module: 'checkout-paypal' })

// Helper to format variant options for display
function formatVariantOptions(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
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
    const validation = safeValidateCheckoutRequest(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { tenantId, items, customerInfo, shippingAddress } = validation.data

    // Generate a temporary session ID for reservations
    const tempSessionId = `paypal_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Verify all pieces exist, are available, and reserve stock
    const reservedItems: {
      pieceId: string
      variantId?: string
      quantity: number
    }[] = []

    // First pass: validate all pieces and reserve stock
    const validatedItems: Array<{
      item: (typeof items)[0]
      piece: Awaited<ReturnType<typeof pieces.getPiece>>
      selectedVariant?: ProductVariant
    }> = []

    for (const item of items) {
      const piece = await pieces.getPiece(tenantId, item.pieceId)

      if (!piece) {
        await stockReservations.cancelReservation(tempSessionId)
        log.warn(
          { pieceId: item.pieceId, tenantId },
          'Piece not found during PayPal checkout',
        )
        throw new NotFoundError('Piece', item.pieceId)
      }

      if (piece.status !== 'available') {
        await stockReservations.cancelReservation(tempSessionId)
        log.warn(
          {
            pieceId: item.pieceId,
            pieceName: piece.name,
            status: piece.status,
            tenantId,
          },
          'Piece not available during PayPal checkout',
        )
        throw new ValidationError(`${piece.name} is no longer available`)
      }

      // Handle variant products
      let selectedVariant: ProductVariant | undefined
      if (piece.hasVariants && item.variantId) {
        selectedVariant = piece.variants?.find((v) => v.id === item.variantId)
        if (!selectedVariant) {
          await stockReservations.cancelReservation(tempSessionId)
          throw new NotFoundError('Variant', item.variantId)
        }
        if (!selectedVariant.isAvailable) {
          await stockReservations.cancelReservation(tempSessionId)
          throw new ValidationError(
            `Selected variant for ${piece.name} is not available`,
          )
        }
      } else if (piece.hasVariants && !item.variantId) {
        await stockReservations.cancelReservation(tempSessionId)
        throw new ValidationError(`Please select a variant for ${piece.name}`)
      }

      // Try to reserve stock
      const reservation = await stockReservations.reserveStock(
        tenantId,
        item.pieceId,
        item.quantity,
        tempSessionId,
        item.variantId,
        30, // 30 minutes expiration
      )

      if (!reservation) {
        await stockReservations.cancelReservation(tempSessionId)
        log.warn(
          {
            pieceId: item.pieceId,
            pieceName: piece.name,
            variantId: item.variantId,
            quantity: item.quantity,
            tenantId,
          },
          'Insufficient stock during PayPal checkout',
        )
        const variantLabel = selectedVariant
          ? ` (${formatVariantOptions(selectedVariant.options)})`
          : ''
        throw new InsufficientStockError(
          `${piece.name}${variantLabel}`,
          item.quantity,
          0,
        )
      }

      reservedItems.push({
        pieceId: item.pieceId,
        variantId: item.variantId,
        quantity: item.quantity,
      })
      validatedItems.push({ item, piece, selectedVariant })
    }

    // Verify tenant exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      await stockReservations.cancelReservation(tempSessionId)
      log.error({ tenantId }, 'Tenant not found during PayPal checkout')
      throw new NotFoundError('Tenant', tenantId)
    }

    // Build PayPal order items
    const paypalItems: any[] = []
    let subtotal = 0

    for (const { item, piece, selectedVariant } of validatedItems) {
      if (!piece) continue

      const basePrice = selectedVariant?.price ?? item.price
      const personalizationTotal = item.personalizationTotal || 0
      const effectivePrice = basePrice + personalizationTotal

      let productName = piece.name
      if (selectedVariant) {
        productName += ` (${formatVariantOptions(selectedVariant.options)})`
      }

      const itemTotal = effectivePrice * item.quantity
      subtotal += itemTotal

      paypalItems.push({
        name: productName,
        description: piece.description?.substring(0, 127) || undefined,
        sku: selectedVariant?.sku || piece.id,
        unit_amount: {
          currency_code: (
            item.currency ||
            piece.currency ||
            'AUD'
          ).toUpperCase(),
          value: effectivePrice.toFixed(2),
        },
        quantity: item.quantity,
        category: piece.digital ? 'DIGITAL_GOODS' : 'PHYSICAL_GOODS',
      })
    }

    // Calculate shipping cost (simplified - using fixed rate or from request)
    const shippingCost = shippingAddress ? 10.0 : 0.0 // Default $10 shipping, or 0 for digital

    const total = subtotal + shippingCost

    // Create PayPal order
    const client = getPayPalClient()
    if (!client) {
      await stockReservations.cancelReservation(tempSessionId)
      return NextResponse.json(
        { error: 'PayPal is not configured', code: 'PAYPAL_NOT_CONFIGURED' },
        { status: 503 },
      )
    }

    const requestOrder = new paypal.orders.OrdersCreateRequest()
    requestOrder.prefer('return=representation')
    // Use type assertion for custom_id which is valid PayPal API but not in SDK types
    const orderBody = {
      intent: 'CAPTURE' as const,
      purchase_units: [
        {
          amount: {
            currency_code: 'AUD',
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'AUD',
                value: subtotal.toFixed(2),
              },
              shipping: {
                currency_code: 'AUD',
                value: shippingCost.toFixed(2),
              },
            },
          },
          items: paypalItems,
          shipping: shippingAddress
            ? {
                name: {
                  full_name: customerInfo.name,
                },
                address: {
                  address_line_1: shippingAddress.line1,
                  address_line_2: shippingAddress.line2 || undefined,
                  admin_area_2: shippingAddress.city,
                  admin_area_1: shippingAddress.state,
                  postal_code: shippingAddress.postalCode,
                  country_code: shippingAddress.country,
                },
              }
            : undefined,
          custom_id: tempSessionId, // Link to stock reservations
        },
      ],
      application_context: {
        brand_name: tenant.businessName,
        user_action: 'PAY_NOW',
        shipping_preference: shippingAddress
          ? 'SET_PROVIDED_ADDRESS'
          : 'NO_SHIPPING',
      },
    }
    requestOrder.requestBody(orderBody as Parameters<typeof requestOrder.requestBody>[0])

    const response = await client.execute<{ id: string }>(requestOrder)
    const order = response.result

    log.info(
      {
        tenantId,
        paypalOrderId: order.id,
        itemCount: items.length,
        customerEmail: customerInfo.email,
        reservationSessionId: tempSessionId,
      },
      'PayPal order created',
    )

    return NextResponse.json({
      orderID: order.id,
      reservationSessionId: tempSessionId,
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
    log.error({ err: error }, 'Unexpected PayPal checkout error')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
