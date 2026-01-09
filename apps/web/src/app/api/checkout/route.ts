import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { pieces, media, stockReservations, tenants } from '@madebuy/db'
import { rateLimiters } from '@/lib/rate-limit'
import type { ShippingMethod, ProductVariant } from '@madebuy/shared'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
  const rateLimitResponse = rateLimiters.checkout(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { tenantId, items, customerInfo, shippingAddress, notes, successUrl, cancelUrl } = body

    if (!tenantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate a temporary session ID for reservations
    // Will be replaced with actual Stripe session ID after creation
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Verify all pieces exist, are available, and reserve stock
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const reservedItems: { pieceId: string; variantId?: string; quantity: number }[] = []

    // First pass: validate all pieces and reserve stock
    const validatedItems: Array<{
      item: typeof items[0]
      piece: Awaited<ReturnType<typeof pieces.getPiece>>
      selectedVariant?: ProductVariant
    }> = []

    for (const item of items) {
      const piece = await pieces.getPiece(tenantId, item.pieceId)

      if (!piece) {
        // Release any reservations made so far
        await stockReservations.cancelReservation(tempSessionId)
        return NextResponse.json(
          { error: `Piece ${item.pieceId} not found` },
          { status: 404 }
        )
      }

      if (piece.status !== 'available') {
        await stockReservations.cancelReservation(tempSessionId)
        return NextResponse.json(
          { error: `${piece.name} is no longer available` },
          { status: 400 }
        )
      }

      // Handle variant products
      let selectedVariant: ProductVariant | undefined
      if (piece.hasVariants && item.variantId) {
        selectedVariant = piece.variants?.find(v => v.id === item.variantId)
        if (!selectedVariant) {
          await stockReservations.cancelReservation(tempSessionId)
          return NextResponse.json(
            { error: `Variant ${item.variantId} not found for ${piece.name}` },
            { status: 404 }
          )
        }
        if (!selectedVariant.isAvailable) {
          await stockReservations.cancelReservation(tempSessionId)
          return NextResponse.json(
            { error: `Selected variant for ${piece.name} is not available` },
            { status: 400 }
          )
        }
      } else if (piece.hasVariants && !item.variantId) {
        // Variant product but no variant selected
        await stockReservations.cancelReservation(tempSessionId)
        return NextResponse.json(
          { error: `Please select a variant for ${piece.name}` },
          { status: 400 }
        )
      }

      // Try to reserve stock (handles race conditions, supports variants)
      const reservation = await stockReservations.reserveStock(
        tenantId,
        item.pieceId,
        item.quantity,
        tempSessionId,
        30, // 30 minutes expiration
        item.variantId // Pass variantId for variant-level stock
      )

      if (!reservation) {
        // Release any reservations made so far
        await stockReservations.cancelReservation(tempSessionId)
        return NextResponse.json(
          { error: `Insufficient stock for ${piece.name}${selectedVariant ? ` (${formatVariantOptions(selectedVariant.options)})` : ''}` },
          { status: 400 }
        )
      }

      reservedItems.push({ pieceId: item.pieceId, variantId: item.variantId, quantity: item.quantity })
      validatedItems.push({ item, piece, selectedVariant })
    }

    // Batch fetch all media in one query (optimization: avoids N+1 queries)
    const mediaIds = validatedItems
      .map(({ piece }) => piece?.primaryMediaId || (piece?.mediaIds?.[0]))
      .filter((id): id is string => !!id)

    const mediaMap = new Map<string, Awaited<ReturnType<typeof media.getMedia>>>()
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
          imageUrl = mediaItem.variants.large?.url || mediaItem.variants.original.url
        }
      }

      // Determine price (variant can override base price)
      const effectivePrice = selectedVariant?.price ?? item.price

      // Build product name with variant info
      let productName = piece.name
      if (selectedVariant) {
        productName += ` (${formatVariantOptions(selectedVariant.options)})`
      }

      // Create Stripe line item
      lineItems.push({
        price_data: {
          currency: (item.currency || piece.currency || 'aud').toLowerCase(),
          product_data: {
            name: productName,
            description: piece.description || undefined,
            images: imageUrl ? [imageUrl] : undefined,
            metadata: selectedVariant ? {
              variantId: selectedVariant.id,
              variantSku: selectedVariant.sku || '',
            } : undefined,
          },
          unit_amount: Math.round(effectivePrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      })
    }

    // Calculate subtotal for free shipping threshold
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + (item.price * item.quantity), 0
    )

    // Verify tenant exists and is valid before processing
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      await stockReservations.cancelReservation(tempSessionId)
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 400 }
      )
    }

    // Verify seller has Stripe Connect set up and can accept payments
    const stripeConfig = tenant.paymentConfig?.stripe
    const connectAccountId = stripeConfig?.connectAccountId
    const connectStatus = stripeConfig?.status
    const chargesEnabled = stripeConfig?.chargesEnabled

    if (!connectAccountId || connectStatus !== 'active' || !chargesEnabled) {
      await stockReservations.cancelReservation(tempSessionId)
      return NextResponse.json(
        { error: 'Store not ready for payments' },
        { status: 400 }
      )
    }

    // Marketplace mode with destination charges

    // Use tenant's shipping methods if configured, otherwise fall back to defaults
    const configuredMethods = (tenant.shippingMethods ?? []).filter((m: ShippingMethod) => m.enabled)
    const effectiveShippingMethods = configuredMethods.length > 0 ? configuredMethods : DEFAULT_SHIPPING_METHODS

    // Build Stripe shipping options
    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = effectiveShippingMethods.map(method => ({
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
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone || '',
        shippingAddressLine1: shippingAddress?.line1 || '',
        shippingAddressLine2: shippingAddress?.line2 || '',
        shippingCity: shippingAddress?.city || '',
        shippingState: shippingAddress?.state || '',
        shippingPostalCode: shippingAddress?.postalCode || '',
        shippingCountry: shippingAddress?.country || '',
        notes: notes || '',
        items: JSON.stringify(items),
        reservationSessionId: tempSessionId, // Link to stock reservations
        connectAccountId, // Track which Connect account received funds
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
