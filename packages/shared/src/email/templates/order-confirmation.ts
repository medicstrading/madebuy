/**
 * Order Confirmation Email Template
 *
 * Sent to customers when they complete a purchase
 */

import type { Order, OrderItem } from '../../types/order'
import type { Tenant } from '../../types/tenant'

export interface OrderConfirmationData {
  order: Order
  tenant: Tenant
  baseUrl: string
}

// Common styles for all emails
const STYLES = {
  container:
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;',
  header:
    'background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 24px;',
  body: 'background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;',
  button:
    'display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;',
  infoBox:
    'background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;',
  footer: 'text-align: center; color: #999; font-size: 12px; margin-top: 20px;',
  table: 'width: 100%; border-collapse: collapse;',
  tableHeader:
    'border-bottom: 2px solid #eee; padding: 12px 8px; text-align: left; font-weight: 600;',
  tableCell: 'border-bottom: 1px solid #eee; padding: 12px 8px;',
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Render order items as HTML table
 */
function renderOrderItemsHtml(items: OrderItem[], currency: string): string {
  return `
    <table style="${STYLES.table}">
      <thead>
        <tr>
          <th style="${STYLES.tableHeader}">Item</th>
          <th style="${STYLES.tableHeader}; text-align: center;">Qty</th>
          <th style="${STYLES.tableHeader}; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td style="${STYLES.tableCell}">
              <div style="font-weight: 600;">${item.name}</div>
              ${
                item.variantAttributes
                  ? `<div style="color: #666; font-size: 14px;">${Object.entries(
                      item.variantAttributes,
                    )
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')}</div>`
                  : ''
              }
              ${item.personalizations && item.personalizations.length > 0 ? `<div style="color: #666; font-size: 14px;">Personalized</div>` : ''}
            </td>
            <td style="${STYLES.tableCell}; text-align: center;">${item.quantity}</td>
            <td style="${STYLES.tableCell}; text-align: right;">${formatCurrency(item.price * item.quantity + (item.personalizationTotal || 0), currency)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `
}

/**
 * Render order items as plain text
 */
function renderOrderItemsText(items: OrderItem[], currency: string): string {
  return items
    .map((item) => {
      let line = `${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity + (item.personalizationTotal || 0), currency)}`
      if (item.variantAttributes) {
        line += `\n   ${Object.entries(item.variantAttributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')}`
      }
      if (item.personalizations && item.personalizations.length > 0) {
        line += `\n   Personalized`
      }
      return line
    })
    .join('\n')
}

/**
 * Render address
 */
function renderAddress(address: Order['shippingAddress']): string {
  return `
    ${address.line1}<br>
    ${address.line2 ? `${address.line2}<br>` : ''}
    ${address.city}, ${address.state} ${address.postcode}<br>
    ${address.country}
  `.trim()
}

/**
 * Render order confirmation email
 */
export function renderOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string
  html: string
  text: string
} {
  const { order, tenant, baseUrl } = data

  const subject = `Order Confirmation #${order.orderNumber} - ${tenant.businessName}`

  const orderUrl = `${baseUrl}/${tenant.slug}/orders/${order.id}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="${STYLES.header}">
    <h1 style="${STYLES.headerTitle}">Thank You for Your Order!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${order.customerName},</p>

    <p>We've received your order and ${order.paymentStatus === 'paid' ? 'payment has been confirmed' : 'are processing your payment'}. ${tenant.businessName} will prepare your items for shipment.</p>

    <div style="${STYLES.infoBox}">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">Order Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Order Number</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${order.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Order Date</td>
          <td style="padding: 8px 0; text-align: right;">${formatDate(order.createdAt)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Payment Status</td>
          <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${order.paymentStatus}</td>
        </tr>
      </table>
    </div>

    <h3 style="margin: 24px 0 12px 0;">Items Ordered</h3>
    ${renderOrderItemsHtml(order.items, order.currency)}

    <div style="${STYLES.infoBox}; margin-top: 24px;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0;">Subtotal</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(order.subtotal, order.currency)}</td>
        </tr>
        ${
          order.discount > 0
            ? `
        <tr>
          <td style="padding: 8px 0; color: #16a34a;">
            Discount${order.promotionCode ? ` (${order.promotionCode})` : ''}
          </td>
          <td style="padding: 8px 0; text-align: right; color: #16a34a;">
            -${formatCurrency(order.discount, order.currency)}
          </td>
        </tr>
        `
            : ''
        }
        ${
          order.shipping > 0
            ? `
        <tr>
          <td style="padding: 8px 0;">Shipping</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(order.shipping, order.currency)}</td>
        </tr>
        `
            : `
        <tr>
          <td style="padding: 8px 0; color: #16a34a;">Shipping</td>
          <td style="padding: 8px 0; text-align: right; color: #16a34a;">FREE</td>
        </tr>
        `
        }
        ${
          order.tax > 0
            ? `
        <tr>
          <td style="padding: 8px 0;">Tax</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(order.tax, order.currency)}</td>
        </tr>
        `
            : ''
        }
        <tr style="font-weight: 600; font-size: 18px;">
          <td style="padding: 12px 0; border-top: 2px solid #333;">Total</td>
          <td style="padding: 12px 0; text-align: right; border-top: 2px solid #333;">
            ${formatCurrency(order.total, order.currency)}
          </td>
        </tr>
      </table>
    </div>

    ${
      !order.isDigitalOnly
        ? `
    <h3 style="margin: 24px 0 12px 0;">Shipping Address</h3>
    <div style="${STYLES.infoBox}">
      <p style="margin: 0; line-height: 1.8;">
        ${renderAddress(order.shippingAddress)}
      </p>
    </div>
    `
        : `
    <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #1e40af;">
        <strong>Digital Order:</strong> Your download links will be sent to ${order.customerEmail} shortly.
      </p>
    </div>
    `
    }

    ${
      order.customerNotes
        ? `
    <h3 style="margin: 24px 0 12px 0;">Your Notes</h3>
    <div style="${STYLES.infoBox}">
      <p style="margin: 0;">${order.customerNotes}</p>
    </div>
    `
        : ''
    }

    <div style="text-align: center; margin: 32px 0;">
      <a href="${orderUrl}" style="${STYLES.button}">View Order Status</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Questions about your order? Reply to this email or contact ${tenant.businessName} directly.
    </p>
  </div>

  <p style="${STYLES.footer}">
    Thank you for supporting Australian makers on MadeBuy!
  </p>
</body>
</html>
  `.trim()

  const text = `
Thank You for Your Order!

Hi ${order.customerName},

We've received your order and ${order.paymentStatus === 'paid' ? 'payment has been confirmed' : 'are processing your payment'}. ${tenant.businessName} will prepare your items for shipment.

ORDER DETAILS
Order Number: ${order.orderNumber}
Order Date: ${formatDate(order.createdAt)}
Payment Status: ${order.paymentStatus}

ITEMS ORDERED
${renderOrderItemsText(order.items, order.currency)}

ORDER SUMMARY
Subtotal: ${formatCurrency(order.subtotal, order.currency)}
${order.discount > 0 ? `Discount${order.promotionCode ? ` (${order.promotionCode})` : ''}: -${formatCurrency(order.discount, order.currency)}` : ''}
${order.shipping > 0 ? `Shipping: ${formatCurrency(order.shipping, order.currency)}` : 'Shipping: FREE'}
${order.tax > 0 ? `Tax: ${formatCurrency(order.tax, order.currency)}` : ''}
Total: ${formatCurrency(order.total, order.currency)}

${
  !order.isDigitalOnly
    ? `
SHIPPING ADDRESS
${order.shippingAddress.line1}
${order.shippingAddress.line2 ? `${order.shippingAddress.line2}\n` : ''}${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postcode}
${order.shippingAddress.country}
`
    : `
DIGITAL ORDER
Your download links will be sent to ${order.customerEmail} shortly.
`
}

${
  order.customerNotes
    ? `
YOUR NOTES
${order.customerNotes}
`
    : ''
}

View your order status: ${orderUrl}

Questions about your order? Reply to this email or contact ${tenant.businessName} directly.

---
Thank you for supporting Australian makers on MadeBuy!
  `.trim()

  return { subject, html, text }
}
