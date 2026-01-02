import { createHmac } from 'crypto'
import type { EtsyReceipt } from './types'

/**
 * Verify Etsy webhook signature
 * Etsy sends webhooks with HMAC-SHA256 signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('base64')

  return signature === expectedSignature
}

/**
 * Webhook event types from Etsy
 */
export type EtsyWebhookEvent =
  | 'listing.created'
  | 'listing.updated'
  | 'listing.deleted'
  | 'receipt.created'
  | 'receipt.updated'
  | 'receipt.paid'

export interface EtsyWebhookPayload {
  event_type: EtsyWebhookEvent
  data: any
  timestamp: number
  shop_id: number
}

export interface ReceiptWebhookData {
  receipt_id: number
  shop_id: number
  buyer_email: string
  buyer_user_id: number
  total_price: {
    amount: number
    divisor: number
    currency_code: string
  }
  is_paid: boolean
  is_shipped: boolean
  transactions: Array<{
    transaction_id: number
    listing_id: number
    title: string
    quantity: number
    price: {
      amount: number
      divisor: number
      currency_code: string
    }
  }>
}

/**
 * Parse webhook payload
 */
export function parseWebhookPayload(payload: string): EtsyWebhookPayload {
  try {
    return JSON.parse(payload)
  } catch (error) {
    throw new Error('Invalid webhook payload')
  }
}

/**
 * Extract order information from receipt webhook
 */
export function extractOrderInfo(receipt: ReceiptWebhookData): {
  orderId: string
  customerEmail: string
  totalAmount: number
  currencyCode: string
  items: Array<{
    listingId: string
    quantity: number
    price: number
  }>
} {
  const totalAmount = receipt.total_price.amount / receipt.total_price.divisor

  const items = receipt.transactions.map((transaction) => ({
    listingId: transaction.listing_id.toString(),
    quantity: transaction.quantity,
    price: transaction.price.amount / transaction.price.divisor,
  }))

  return {
    orderId: receipt.receipt_id.toString(),
    customerEmail: receipt.buyer_email,
    totalAmount,
    currencyCode: receipt.total_price.currency_code,
    items,
  }
}
