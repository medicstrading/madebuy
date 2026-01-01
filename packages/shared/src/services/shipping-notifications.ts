/**
 * Shipping Notifications Service
 *
 * Sends shipping notification emails to customers based on shipment status changes.
 * Integrates with email templates and handles notification preferences.
 */

import type { Shipment, ShipmentStatus, Order } from '../types'
import {
  renderShippedEmail,
  renderOutForDeliveryEmail,
  renderDeliveredEmail,
  renderDeliveryFailedEmail,
  type ShippingNotificationData,
} from '../email/templates/shipping-notification'
import { CARRIER_NAMES } from '../types/shipping'

/**
 * Tenant info needed for notifications
 */
export interface TenantInfo {
  id: string
  slug: string
  shopName?: string
  businessName?: string
  email?: string
}

/**
 * Email sender interface - implement with your email provider
 */
export interface EmailSender {
  send(options: {
    to: string
    subject: string
    html: string
    text: string
    from?: string
    replyTo?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }>
}

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
  skipReason?: string
}

/**
 * Build notification data from shipment and order
 */
export function buildNotificationData(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo
): ShippingNotificationData {
  // Extract items from order
  const items = (order.items || []).map(item => ({
    name: item.name,
    quantity: item.quantity,
    imageUrl: item.imageUrl,
  }))

  // Get carrier name
  const carrier = CARRIER_NAMES[shipment.carrier] || shipment.carrier

  // Format estimated delivery
  const estimatedDelivery = shipment.estimatedDeliveryDate || shipment.estimatedDelivery
  const estimatedDeliveryStr = estimatedDelivery
    ? (estimatedDelivery instanceof Date
        ? estimatedDelivery.toISOString()
        : String(estimatedDelivery))
    : undefined

  return {
    orderNumber: order.orderNumber || order.id,
    customerName: order.customerName || order.customerEmail.split('@')[0],
    shopName: tenant.shopName || tenant.businessName || 'Seller',
    trackingNumber: shipment.trackingNumber || '',
    trackingUrl: shipment.trackingUrl || '',
    carrier,
    estimatedDelivery: estimatedDeliveryStr,
    items,
    deliveryAddress: order.shippingAddress
      ? {
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
        }
      : undefined,
  }
}

/**
 * Check if notification should be sent based on status and preferences
 */
export function shouldSendNotification(
  shipment: Shipment,
  status: ShipmentStatus
): { send: boolean; reason?: string } {
  // Always send on failure
  if (status === 'failed' || status === 'returned') {
    return { send: true }
  }

  // Check notification preferences
  switch (status) {
    case 'picked_up':
    case 'in_transit':
      if (shipment.notifyOnShipped === false) {
        return { send: false, reason: 'Shipped notifications disabled' }
      }
      return { send: true }

    case 'out_for_delivery':
      if (shipment.notifyOnOutForDelivery === false) {
        return { send: false, reason: 'Out for delivery notifications disabled' }
      }
      return { send: true }

    case 'delivered':
      if (shipment.notifyOnDelivered === false) {
        return { send: false, reason: 'Delivered notifications disabled' }
      }
      return { send: true }

    default:
      return { send: false, reason: `No notification for status: ${status}` }
  }
}

/**
 * Get email content for a status
 */
export function getEmailContent(
  status: ShipmentStatus,
  data: ShippingNotificationData,
  baseUrl: string = 'https://madebuy.com.au'
): { subject: string; html: string; text: string } | null {
  switch (status) {
    case 'picked_up':
    case 'in_transit':
      return renderShippedEmail(data, baseUrl)

    case 'out_for_delivery':
      return renderOutForDeliveryEmail(data, baseUrl)

    case 'delivered':
      return renderDeliveredEmail(data, baseUrl)

    case 'failed':
    case 'returned':
      return renderDeliveryFailedEmail(data, baseUrl)

    default:
      return null
  }
}

/**
 * Send shipped notification
 */
export async function sendShippedNotification(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo,
  emailSender: EmailSender,
  options?: { baseUrl?: string; from?: string }
): Promise<NotificationResult> {
  const { send, reason } = shouldSendNotification(shipment, 'in_transit')
  if (!send) {
    return { success: true, skipped: true, skipReason: reason }
  }

  const data = buildNotificationData(shipment, order, tenant)
  const content = renderShippedEmail(data, options?.baseUrl)

  try {
    const result = await emailSender.send({
      to: order.customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      from: options?.from,
      replyTo: tenant.email,
    })

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send out for delivery notification
 */
export async function sendOutForDeliveryNotification(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo,
  emailSender: EmailSender,
  options?: { baseUrl?: string; from?: string }
): Promise<NotificationResult> {
  const { send, reason } = shouldSendNotification(shipment, 'out_for_delivery')
  if (!send) {
    return { success: true, skipped: true, skipReason: reason }
  }

  const data = buildNotificationData(shipment, order, tenant)
  const content = renderOutForDeliveryEmail(data, options?.baseUrl)

  try {
    const result = await emailSender.send({
      to: order.customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      from: options?.from,
      replyTo: tenant.email,
    })

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send delivered notification
 */
export async function sendDeliveredNotification(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo,
  emailSender: EmailSender,
  options?: { baseUrl?: string; from?: string }
): Promise<NotificationResult> {
  const { send, reason } = shouldSendNotification(shipment, 'delivered')
  if (!send) {
    return { success: true, skipped: true, skipReason: reason }
  }

  const data = buildNotificationData(shipment, order, tenant)
  const content = renderDeliveredEmail(data, options?.baseUrl)

  try {
    const result = await emailSender.send({
      to: order.customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      from: options?.from,
      replyTo: tenant.email,
    })

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send delivery failed notification
 */
export async function sendDeliveryFailedNotification(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo,
  emailSender: EmailSender,
  options?: { baseUrl?: string; from?: string }
): Promise<NotificationResult> {
  // Always send failure notifications
  const data = buildNotificationData(shipment, order, tenant)
  const content = renderDeliveryFailedEmail(data, options?.baseUrl)

  try {
    const result = await emailSender.send({
      to: order.customerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      from: options?.from,
      replyTo: tenant.email,
    })

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send notification based on status
 * Convenience function that routes to the correct notification type
 */
export async function sendShippingNotification(
  shipment: Shipment,
  order: Order,
  tenant: TenantInfo,
  status: ShipmentStatus,
  emailSender: EmailSender,
  options?: { baseUrl?: string; from?: string }
): Promise<NotificationResult> {
  switch (status) {
    case 'picked_up':
    case 'in_transit':
      return sendShippedNotification(shipment, order, tenant, emailSender, options)

    case 'out_for_delivery':
      return sendOutForDeliveryNotification(shipment, order, tenant, emailSender, options)

    case 'delivered':
      return sendDeliveredNotification(shipment, order, tenant, emailSender, options)

    case 'failed':
    case 'returned':
      return sendDeliveryFailedNotification(shipment, order, tenant, emailSender, options)

    default:
      return {
        success: true,
        skipped: true,
        skipReason: `No notification defined for status: ${status}`,
      }
  }
}
