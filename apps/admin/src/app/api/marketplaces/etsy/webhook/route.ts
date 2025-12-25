import { NextRequest, NextResponse } from 'next/server'
import { Etsy } from '@madebuy/marketplaces'
import { pieces, orders, tenants } from '@madebuy/db'

const ETSY_WEBHOOK_SECRET = process.env.ETSY_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-etsy-signature')
    const payload = await request.text()

    // Verify webhook signature
    if (!signature || !Etsy.verifyWebhookSignature(payload, signature, ETSY_WEBHOOK_SECRET)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const event = Etsy.parseWebhookPayload(payload)

    // Handle different event types
    switch (event.event_type) {
      case 'receipt.created':
      case 'receipt.paid':
        await handleReceiptEvent(event)
        break

      case 'listing.updated':
        await handleListingUpdate(event)
        break

      // Add other event handlers as needed
      default:
        console.log('Unhandled Etsy webhook event:', event.event_type)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Etsy webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleReceiptEvent(event: Etsy.EtsyWebhookPayload) {
  try {
    const receiptData = event.data as Etsy.ReceiptWebhookData
    const orderInfo = Etsy.extractOrderInfo(receiptData)

    // Find tenant by shop ID
    // Note: You'll need to add a way to look up tenant by shop ID
    // For now, we'll skip tenant lookup and just reduce inventory

    // Reduce inventory for each item
    for (const item of orderInfo.items) {
      // Find piece by Etsy listing ID
      const foundPieces = await pieces.findPiecesByEtsyListingId(item.listingId)

      for (const piece of foundPieces) {
        if (piece.stock && piece.stock >= item.quantity) {
          // Reduce stock
          await pieces.updatePiece(piece.tenantId, piece.id, {
            stock: piece.stock - item.quantity,
          })

          // Update Etsy integration data
          if (piece.integrations?.etsy) {
            await pieces.updatePiece(piece.tenantId, piece.id, {
              integrations: {
                ...piece.integrations,
                etsy: {
                  ...piece.integrations.etsy,
                  etsyQuantity: (piece.integrations.etsy.etsyQuantity || 0) - item.quantity,
                  lastSyncedAt: new Date(),
                },
              },
            } as any)
          }

          // Create order record in MadeBuy
          // Note: This is a simplified version
          /*
          await ordersRepository.create(piece.tenantId, {
            orderNumber: `ETSY-${orderInfo.orderId}`,
            source: 'etsy',
            customerName: orderInfo.customerEmail,
            customerEmail: orderInfo.customerEmail,
            items: [{
              pieceId: piece.id,
              pieceName: piece.name,
              quantity: item.quantity,
              price: item.price,
            }],
            totalAmount: orderInfo.totalAmount,
            currency: orderInfo.currencyCode,
            status: 'processing',
            paymentStatus: 'paid',
          })
          */
        }
      }
    }
  } catch (error) {
    console.error('Error handling receipt event:', error)
    throw error
  }
}

async function handleListingUpdate(event: Etsy.EtsyWebhookPayload) {
  // Handle listing updates from Etsy
  // This could sync changes made directly on Etsy back to MadeBuy
  console.log('Listing updated on Etsy:', event.data)
}
