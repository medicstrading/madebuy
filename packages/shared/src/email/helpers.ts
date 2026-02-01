/**
 * Email Helper Functions
 *
 * High-level functions for sending transactional emails
 */

import type { Order } from '../types/order'
import type { Tenant } from '../types/tenant'
import {
  createEmailSender,
  type EmailSender,
  getPlatformFromAddress,
  getTenantFromAddress,
} from './email'
import { renderOrderConfirmationEmail } from './templates/order-confirmation'
import { renderOrderNotificationEmail } from './templates/order-notification'
import { renderPasswordResetEmail } from './templates/password-reset'
import {
  renderDeliveredEmail,
  renderOutForDeliveryEmail,
  renderShippedEmail,
  type ShippingNotificationData,
} from './templates/shipping-notification'
import { renderWelcomeEmail } from './templates/welcome'

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(params: {
  order: Order
  tenant: Tenant
  baseUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const sender = createEmailSender()

  if (!sender) {
    console.warn(
      '[Email] Email sender not configured, skipping order confirmation',
    )
    return { success: false, error: 'Email sender not configured' }
  }

  const { order, tenant, baseUrl = 'https://madebuy.com.au' } = params

  const { subject, html, text } = renderOrderConfirmationEmail({
    order,
    tenant,
    baseUrl,
  })

  return await sender.send({
    to: { email: order.customerEmail, name: order.customerName },
    from: getTenantFromAddress(tenant),
    subject,
    html,
    text,
    replyTo: { email: tenant.email, name: tenant.businessName },
  })
}

/**
 * Send order notification email to seller/tenant
 */
export async function sendOrderNotification(params: {
  order: Order
  tenant: Tenant
  adminUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const sender = createEmailSender()

  if (!sender) {
    console.warn(
      '[Email] Email sender not configured, skipping order notification',
    )
    return { success: false, error: 'Email sender not configured' }
  }

  const { order, tenant, adminUrl = 'https://admin.madebuy.com.au' } = params

  const { subject, html, text } = renderOrderNotificationEmail({
    order,
    tenant,
    adminUrl,
  })

  return await sender.send({
    to: { email: tenant.email, name: tenant.businessName },
    from: getPlatformFromAddress(),
    subject,
    html,
    text,
  })
}

/**
 * Send shipping notification email to customer
 */
export async function sendShippingNotification(params: {
  order: Order
  tenant: Tenant
  trackingInfo?: {
    trackingNumber?: string
    trackingUrl?: string
    carrier?: string
    estimatedDelivery?: string
  }
  status: 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_failed'
  baseUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const sender = createEmailSender()

  if (!sender) {
    console.warn(
      '[Email] Email sender not configured, skipping shipping notification',
    )
    return { success: false, error: 'Email sender not configured' }
  }

  const {
    order,
    tenant,
    trackingInfo = {},
    status,
    baseUrl = 'https://madebuy.com.au',
  } = params

  const data: ShippingNotificationData = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    shopName: tenant.businessName,
    trackingNumber:
      trackingInfo.trackingNumber || order.trackingNumber || 'N/A',
    trackingUrl: trackingInfo.trackingUrl || order.trackingUrl || '',
    carrier: trackingInfo.carrier || order.carrier || 'Australia Post',
    estimatedDelivery: trackingInfo.estimatedDelivery,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    })),
    deliveryAddress: {
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
    },
  }

  let emailContent: { subject: string; html: string; text: string }

  switch (status) {
    case 'shipped':
      emailContent = renderShippedEmail(data, baseUrl)
      break
    case 'out_for_delivery':
      emailContent = renderOutForDeliveryEmail(data, baseUrl)
      break
    case 'delivered':
      emailContent = renderDeliveredEmail(data, baseUrl)
      break
    case 'delivery_failed':
      emailContent = renderDeliveredEmail(data, baseUrl) // Using delivered template for now
      break
    default:
      return { success: false, error: 'Invalid shipping status' }
  }

  return await sender.send({
    to: { email: order.customerEmail, name: order.customerName },
    from: getTenantFromAddress(tenant),
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    replyTo: { email: tenant.email, name: tenant.businessName },
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(params: {
  email: string
  tenantName: string
  resetLink: string
  expiresInMinutes?: number
}): Promise<{ success: boolean; error?: string }> {
  const sender = createEmailSender()

  if (!sender) {
    console.warn('[Email] Email sender not configured, skipping password reset')
    return { success: false, error: 'Email sender not configured' }
  }

  const { email, tenantName, resetLink, expiresInMinutes } = params

  const { subject, html, text } = renderPasswordResetEmail({
    tenantName,
    tenantEmail: email,
    resetLink,
    expiresInMinutes,
  })

  return await sender.send({
    to: { email, name: tenantName },
    from: getPlatformFromAddress(),
    subject,
    html,
    text,
  })
}

/**
 * Send welcome email to new tenant
 */
export async function sendWelcomeEmail(params: {
  tenant: Tenant
  adminUrl?: string
  marketplaceUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const sender = createEmailSender()

  if (!sender) {
    console.warn('[Email] Email sender not configured, skipping welcome email')
    return { success: false, error: 'Email sender not configured' }
  }

  const {
    tenant,
    adminUrl = 'https://admin.madebuy.com.au',
    marketplaceUrl = 'https://madebuy.com.au',
  } = params

  const { subject, html, text } = renderWelcomeEmail({
    tenant,
    adminUrl,
    marketplaceUrl,
  })

  return await sender.send({
    to: { email: tenant.email, name: tenant.businessName || 'New Seller' },
    from: getPlatformFromAddress(),
    subject,
    html,
    text,
  })
}
