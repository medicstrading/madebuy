/**
 * Order Notification Email Template
 *
 * Sent to sellers/tenants when they receive a new order
 */

import type { Order, OrderItem } from '../../types/order'
import type { Tenant } from '../../types/tenant'

export interface OrderNotificationData {
  order: Order
  tenant: Tenant
  adminUrl: string
}

// Common styles for all emails
const STYLES = {
  container:
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;',
  header:
    'background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 24px;',
  body: 'background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;',
  button:
    'display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;',
  infoBox:
    'background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;',
  alertBox:
    'background: #dbeafe; border-radius: 8px; padding: 20px; margin: 24px 0;',
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
    hour: '2-digit',
    minute: '2-digit',
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
              ${item.personalizations && item.personalizations.length > 0 ? `<div style="color: #e11d48; font-size: 14px;">⚠ Personalization Required</div>` : ''}
              ${item.isDigital ? `<div style="color: #7c3aed; font-size: 14px;">Digital Product</div>` : ''}
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
        line += `\n   ⚠ Personalization Required`
      }
      if (item.isDigital) {
        line += `\n   Digital Product`
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
 * Render order notification email (to seller)
 */
export function renderOrderNotificationEmail(data: OrderNotificationData): {
  subject: string
  html: string
  text: string
} {
  const { order, tenant, adminUrl } = data

  const subject = `New Order #${order.orderNumber} - ${formatCurrency(order.total, order.currency)}`

  const orderManageUrl = `${adminUrl}/orders/${order.id}`

  const hasPersonalizations = order.items.some(
    (item) => item.personalizations && item.personalizations.length > 0,
  )

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="${STYLES.header}">
    <h1 style="${STYLES.headerTitle}">New Order Received!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${tenant.businessName},</p>

    <p>Great news! You have a new order.</p>

    ${
      hasPersonalizations
        ? `
    <div style="${STYLES.alertBox}">
      <p style="margin: 0; color: #1e40af;">
        <strong>⚠ Action Required:</strong> This order includes personalized items. Please review the customization details.
      </p>
    </div>
    `
        : ''
    }

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
          <td style="padding: 8px 0; text-align: right;">
            <span style="background: ${order.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7'}; color: ${order.paymentStatus === 'paid' ? '#166534' : '#854d0e'}; padding: 4px 8px; border-radius: 4px; text-transform: capitalize;">
              ${order.paymentStatus}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Total Amount</td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold;">
            ${formatCurrency(order.total, order.currency)}
          </td>
        </tr>
        ${
          order.netAmount
            ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Your Earnings</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">
            ${formatCurrency(order.netAmount, order.currency)}
          </td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <h3 style="margin: 24px 0 12px 0;">Customer Information</h3>
    <div style="${STYLES.infoBox}">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Name</td>
          <td style="padding: 8px 0; text-align: right;">${order.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Email</td>
          <td style="padding: 8px 0; text-align: right;">
            <a href="mailto:${order.customerEmail}" style="color: #2563eb;">${order.customerEmail}</a>
          </td>
        </tr>
        ${
          order.customerPhone
            ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Phone</td>
          <td style="padding: 8px 0; text-align: right;">${order.customerPhone}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <h3 style="margin: 24px 0 12px 0;">Items Ordered</h3>
    ${renderOrderItemsHtml(order.items, order.currency)}

    ${
      !order.isDigitalOnly
        ? `
    <h3 style="margin: 24px 0 12px 0;">Shipping Address</h3>
    <div style="${STYLES.infoBox}">
      <p style="margin: 0; line-height: 1.8;">
        ${renderAddress(order.shippingAddress)}
      </p>
      <p style="margin: 12px 0 0 0; color: #666; font-size: 14px;">
        Shipping Method: ${order.shippingMethod}
      </p>
    </div>
    `
        : `
    <div style="background: #f3e8ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #6b21a8;">
        <strong>Digital Order:</strong> No shipping required. Customer will receive download links automatically.
      </p>
    </div>
    `
    }

    ${
      order.customerNotes
        ? `
    <h3 style="margin: 24px 0 12px 0;">Customer Notes</h3>
    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #854d0e;">${order.customerNotes}</p>
    </div>
    `
        : ''
    }

    <div style="text-align: center; margin: 32px 0;">
      <a href="${orderManageUrl}" style="${STYLES.button}">Manage Order</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      <strong>Next Steps:</strong>
    </p>
    <ul style="color: #666; font-size: 14px; margin: 8px 0;">
      ${hasPersonalizations ? '<li>Review personalization requirements</li>' : ''}
      <li>Confirm payment has been received${order.paymentStatus === 'paid' ? ' ✓' : ''}</li>
      ${!order.isDigitalOnly ? '<li>Prepare items for shipment</li>' : ''}
      ${!order.isDigitalOnly ? '<li>Add tracking information when shipped</li>' : ''}
    </ul>
  </div>

  <p style="${STYLES.footer}">
    MadeBuy Seller Dashboard - Your Australian marketplace partner
  </p>
</body>
</html>
  `.trim()

  const text = `
New Order Received!

Hi ${tenant.businessName},

Great news! You have a new order.

${
  hasPersonalizations
    ? `
⚠ ACTION REQUIRED: This order includes personalized items. Please review the customization details.
`
    : ''
}

ORDER DETAILS
Order Number: ${order.orderNumber}
Order Date: ${formatDate(order.createdAt)}
Payment Status: ${order.paymentStatus}
Total Amount: ${formatCurrency(order.total, order.currency)}
${order.netAmount ? `Your Earnings: ${formatCurrency(order.netAmount, order.currency)}` : ''}

CUSTOMER INFORMATION
Name: ${order.customerName}
Email: ${order.customerEmail}
${order.customerPhone ? `Phone: ${order.customerPhone}` : ''}

ITEMS ORDERED
${renderOrderItemsText(order.items, order.currency)}

${
  !order.isDigitalOnly
    ? `
SHIPPING ADDRESS
${order.shippingAddress.line1}
${order.shippingAddress.line2 ? `${order.shippingAddress.line2}\n` : ''}${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postcode}
${order.shippingAddress.country}

Shipping Method: ${order.shippingMethod}
`
    : `
DIGITAL ORDER
No shipping required. Customer will receive download links automatically.
`
}

${
  order.customerNotes
    ? `
CUSTOMER NOTES
${order.customerNotes}
`
    : ''
}

Manage this order: ${orderManageUrl}

NEXT STEPS:
${hasPersonalizations ? '- Review personalization requirements\n' : ''}- Confirm payment has been received${order.paymentStatus === 'paid' ? ' ✓' : ''}
${!order.isDigitalOnly ? '- Prepare items for shipment\n- Add tracking information when shipped' : ''}

---
MadeBuy Seller Dashboard - Your Australian marketplace partner
  `.trim()

  return { subject, html, text }
}
