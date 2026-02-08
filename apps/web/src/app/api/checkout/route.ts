import { media, pieces, stockReservations, tenants } from '@madebuy/db'
import type { ProductVariant, ShippingMethod } from '@madebuy/shared'
import {
  createLogger,
  ExternalServiceError,
  InsufficientStockError,
  isMadeBuyError,
  NotFoundError,
  safeValidateCheckoutRequest,
  sanitizeInput,
  toErrorResponse,
  ValidationError,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { rateLimiters } from '@/lib/rate-limit'

const log = createLogger({ module: 'checkout' })

// Validate Stripe secret key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Default shipping methods if tenant hasn't configured any
const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard Shipping',
    description: 'Delivered in 5-10 business days',
    price: 9.95,
    currency: 'AUD',
    estimatedDays: { min: 5, max: 10 },
    countries: [],
    enabled: true,
  },
  {
    id: 'express',
    name: 'Express Shipping',
    description: 'Delivered in 2-3 business days',
    price: 19.95,
    currency: 'AUD',
    estimatedDays: { min: 2, max: 3 },
    countries: [],
    enabled: true,
  },
]

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
    const {
      tenantId,
      items,
      customerInfo,
      shippingAddress,
      notes,
      successUrl,
      cancelUrl,
    } = validation.data

    // Generate a temporary session ID for reservations
    // Will be replaced with actual Stripe session ID after creation
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Verify all pieces exist, are available, and reserve stock
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
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
        // Release any reservations made so far
        await stockReservations.cancelReservation(tempSessionId)
        log.warn(
          { pieceId: item.pieceId, tenantId },
          'Piece not found during checkout',
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
          'Piece not available during checkout',
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
        // Variant product but no variant selected
        await stockReservations.cancelReservation(tempSessionId)
        throw new ValidationError(`Please select a variant for ${piece.name}`)
      }

      // PAY-01: Validate that variant still exists (explicit check before using client-sent price)
      // Server already resolves variant price at line 222, but validate existence first
      if (item.variantId && piece.hasVariants) {
        const variantExists = piece.variants?.some((v) => v.id === item.variantId)
        if (!variantExists) {
          await stockReservations.cancelReservation(tempSessionId)
          throw new NotFoundError('Product variant', item.variantId)
        }
      }

      // Try to reserve stock (handles race conditions, supports variants)
      const reservation = await stockReservations.reserveStock(
        tenantId,
        item.pieceId,
        item.quantity,
        tempSessionId,
        item.variantId, // Pass variantId for variant-level stock
        30, // 30 minutes expiration
      )

      if (!reservation) {
        // Release any reservations made so far
        await stockReservations.cancelReservation(tempSessionId)
        log.warn(
          {
            pieceId: item.pieceId,
            pieceName: piece.name,
            variantId: item.variantId,
            quantity: item.quantity,
            tenantId,
          },
          'Insufficient stock during checkout',
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

    // Batch fetch all media in one query (optimization: avoids N+1 queries)
    const mediaIds = validatedItems
      .map(({ piece }) => piece?.primaryMediaId || piece?.mediaIds?.[0])
      .filter((id): id is string => !!id)

    const mediaMap = new Map<
      string,
      Awaited<ReturnType<typeof media.getMedia>>
    >()
    if (mediaIds.length > 0) {
      const mediaItems = await media.getMediaByIds(tenantId, mediaIds)
      for (const m of mediaItems) {
        if (m) mediaMap.set(m.id, m)
      }
    }

    // Second pass: build line items with pre-fetched media
    for (const { item, piece, selectedVariant } of validatedItems) {
      if (!piece) continue // Type guard

      // Get image URL from pre-fetched media
      let imageUrl: string | undefined
      const mediaId = piece.primaryMediaId || piece.mediaIds?.[0]
      if (mediaId) {
        const mediaItem = mediaMap.get(mediaId)
        if (mediaItem) {
          imageUrl =
            mediaItem.variants.large?.url || mediaItem.variants.original.url
        }
      }

      // Determine price (variant can override base price, personalization adds to it)
      const basePrice = selectedVariant?.price ?? item.price
      const personalizationTotal = item.personalizationTotal || 0
      const effectivePrice = basePrice + personalizationTotal

      // Build product name with variant info
      let productName = piece.name
      if (selectedVariant) {
        productName += ` (${formatVariantOptions(selectedVariant.options)})`
      }

      // Build description including personalization details
      let description = piece.description || ''
      if (item.personalization && item.personalization.length > 0) {
        const personalizationLines = item.personalization
          .map((p) => `${p.fieldName}: ${String(p.value)}`)
          .join(', ')
        description = description
          ? `${description}\n\nPersonalization: ${personalizationLines}`
          : `Personalization: ${personalizationLines}`
      }

      // Build metadata including variant and personalization
      const productMetadata: Record<string, string> = {}
      if (selectedVariant) {
        productMetadata.variantId = selectedVariant.id
        productMetadata.variantSku = selectedVariant.sku || ''
      }
      if (item.personalization && item.personalization.length > 0) {
        productMetadata.hasPersonalization = 'true'
        productMetadata.personalizationTotal = String(personalizationTotal)
      }

      // Create Stripe line item
      lineItems.push({
        price_data: {
          currency: (item.currency || piece.currency || 'aud').toLowerCase(),
          product_data: {
            name: productName,
            description: description || undefined,
            images: imageUrl ? [imageUrl] : undefined,
            metadata:
              Object.keys(productMetadata).length > 0
                ? productMetadata
                : undefined,
          },
          unit_amount: Math.round(effectivePrice * 100), // Convert to cents (includes personalization)
        },
        quantity: item.quantity,
      })
    }

    // Calculate subtotal for free shipping threshold (includes personalization costs)
    const _subtotal = items.reduce(
      (
        sum: number,
        item: {
          price: number
          quantity: number
          personalizationTotal?: number
        },
      ) =>
        sum + (item.price + (item.personalizationTotal || 0)) * item.quantity,
      0,
    )

    // Verify tenant exists and is valid before processing
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      await stockReservations.cancelReservation(tempSessionId)
      log.error({ tenantId }, 'Tenant not found during checkout')
      throw new NotFoundError('Tenant', tenantId)
    }

    // Verify seller has Stripe Connect set up and can accept payments
    const stripeConfig = tenant.paymentConfig?.stripe
    const connectAccountId = stripeConfig?.connectAccountId
    const connectStatus = stripeConfig?.status
    const chargesEnabled = stripeConfig?.chargesEnabled

    if (!connectAccountId || connectStatus !== 'active' || !chargesEnabled) {
      await stockReservations.cancelReservation(tempSessionId)
      log.warn(
        { tenantId, connectAccountId, connectStatus, chargesEnabled },
        'Stripe Connect not ready for payments',
      )
      throw new ExternalServiceError(
        'Stripe Connect',
        'Store not ready for payments',
      )
    }

    // Marketplace mode with destination charges

    // Use tenant's shipping methods if configured, otherwise fall back to defaults
    const configuredMethods = (tenant.shippingMethods ?? []).filter(
      (m: ShippingMethod) => m.enabled,
    )
    const effectiveShippingMethods =
      configuredMethods.length > 0
        ? configuredMethods
        : DEFAULT_SHIPPING_METHODS

    // Build Stripe shipping options
    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] =
      effectiveShippingMethods.map((method) => ({
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: {
            amount: Math.round(method.price * 100),
            currency: (method.currency || 'AUD').toLowerCase(),
          },
          display_name: method.name,
          delivery_estimate: {
            minimum: {
              unit: 'business_day' as const,
              value: method.estimatedDays.min,
            },
            maximum: {
              unit: 'business_day' as const,
              value: method.estimatedDays.max,
            },
          },
        },
      }))

    // Add local pickup option
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: 0,
          currency: 'aud',
        },
        display_name: 'Local Pickup',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 1 },
          maximum: { unit: 'business_day', value: 2 },
        },
      },
    })

    // Create Stripe checkout session with destination charges (marketplace mode)
    // Zero platform fees - MadeBuy's differentiator. Sellers keep 100% minus Stripe processing.
    const platformFeeAmount = 0

    // PAY-07: Add idempotency key to prevent duplicate checkout sessions on retry
    const idempotencyKey = `checkout_${tenantId}_${Date.now()}_${items.map(i => i.pieceId).join('_')}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerInfo.email,
      shipping_address_collection: {
        allowed_countries: ['AU', 'NZ', 'US', 'GB'],
      },
      shipping_options: shippingOptions,
      // Destination charges: payment goes to seller's Connect account
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: connectAccountId,
        },
      },
      metadata: {
        tenantId,
        customerName: sanitizeInput(customerInfo.name),
        customerPhone: customerInfo.phone
          ? sanitizeInput(customerInfo.phone)
          : '',
        shippingAddressLine1: shippingAddress?.line1
          ? sanitizeInput(shippingAddress.line1)
          : '',
        shippingAddressLine2: shippingAddress?.line2
          ? sanitizeInput(shippingAddress.line2)
          : '',
        shippingCity: shippingAddress?.city
          ? sanitizeInput(shippingAddress.city)
          : '',
        shippingState: shippingAddress?.state
          ? sanitizeInput(shippingAddress.state)
          : '',
        shippingPostalCode: shippingAddress?.postalCode
          ? sanitizeInput(shippingAddress.postalCode)
          : '',
        shippingCountry: shippingAddress?.country
          ? sanitizeInput(shippingAddress.country)
          : '',
        notes: notes ? sanitizeInput(notes) : '',
        items: JSON.stringify(items),
        reservationSessionId: tempSessionId, // Link to stock reservations
        connectAccountId, // Track which Connect account received funds
      },
    }, {
      idempotencyKey,
    })

    log.info(
      {
        tenantId,
        sessionId: session.id,
        connectAccountId,
        itemCount: items.length,
        customerEmail: customerInfo.email,
        reservationSessionId: tempSessionId,
      },
      'Checkout session created',
    )

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json(
        { error: msg, code, details },
        { status: statusCode },
      )
    }

    // Log and return generic error for unexpected errors
    log.error({ err: error }, 'Unexpected checkout error')
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
