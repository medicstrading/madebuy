import { orders } from '@madebuy/db'
import { createLogger } from '@madebuy/shared'
import crypto from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'

const log = createLogger({ module: 'webhooks-paypal' })

/**
 * Verify PayPal webhook signature
 * https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#link-verifyyourwebhooksignature
 */
function verifyWebhookSignature(body: string, headers: Headers): boolean {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  const transmissionId = headers.get('paypal-transmission-id')
  const transmissionTime = headers.get('paypal-transmission-time')
  const certUrl = headers.get('paypal-cert-url')
  const authAlgo = headers.get('paypal-auth-algo')
  const transmissionSig = headers.get('paypal-transmission-sig')

  if (
    !webhookId ||
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    log.warn('Missing PayPal webhook verification headers')
    return false
  }

  // For production, implement full signature verification
  // For now, just check if webhook secret is configured
  return Boolean(webhookId)
}

export async function POST(request: NextRequest) {
  try {
    // PayPal webhook is not fully implemented yet - disable unless PAYPAL_WEBHOOK_ID is configured
    if (!process.env.PAYPAL_WEBHOOK_ID) {
      log.warn('PayPal webhook endpoint called but PAYPAL_WEBHOOK_ID is not configured')
      return NextResponse.json(
        { error: 'PayPal webhook integration is not yet implemented' },
        { status: 501 },
      )
    }

    const rawBody = await request.text()

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, request.headers)) {
      log.warn('Invalid PayPal webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // WH-01: Wrap JSON.parse in try/catch
    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch (parseError) {
      log.error(
        { err: parseError, rawBodyLength: rawBody.length },
        'Failed to parse PayPal webhook body',
      )
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      )
    }
    const eventType = event.event_type

    log.info({ eventType, eventId: event.id }, 'PayPal webhook received')

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // Payment captured successfully
        const resource = event.resource
        const paypalOrderId = resource.supplementary_data?.related_ids?.order_id

        if (!paypalOrderId) {
          log.warn({ eventId: event.id }, 'No PayPal order ID in capture event')
          break
        }

        // Find order by PayPal order ID
        // Note: We need a new repository function to find by paypalOrderId
        // For now, just log it
        log.info(
          {
            paypalOrderId,
            captureId: resource.id,
            amount: resource.amount,
            status: resource.status,
          },
          'PayPal payment captured via webhook',
        )
        break
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        // Payment refunded
        const resource = event.resource
        const captureId = resource.id
        const refundAmount = parseFloat(resource.amount.value) * 100 // Convert to cents

        // Find order by PayPal capture ID and update refund status
        // Note: We need a repository function to find by paypalCaptureId
        log.info(
          {
            captureId,
            refundAmount,
            refundId: resource.supplementary_data?.related_ids?.refund_id,
          },
          'PayPal refund processed via webhook',
        )
        break
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        // Payment denied/failed
        const resource = event.resource
        const paypalOrderId = resource.supplementary_data?.related_ids?.order_id

        log.warn(
          {
            paypalOrderId,
            captureId: resource.id,
            status: resource.status,
          },
          'PayPal payment denied via webhook',
        )
        break
      }

      case 'CUSTOMER.DISPUTE.CREATED': {
        // Dispute/chargeback created
        const resource = event.resource
        const disputeId = resource.dispute_id

        log.warn(
          {
            disputeId,
            reason: resource.reason,
            disputeAmount: resource.dispute_amount,
          },
          'PayPal dispute created via webhook',
        )
        break
      }

      default:
        log.info({ eventType }, 'Unhandled PayPal webhook event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error({ err: error }, 'Error processing PayPal webhook')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  }
}
