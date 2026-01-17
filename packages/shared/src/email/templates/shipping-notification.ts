/**
 * Shipping Notification Email Templates
 *
 * Templates for shipping status emails:
 * - Shipped: When package is picked up by carrier
 * - Out for Delivery: When package is out for final delivery
 * - Delivered: When package is successfully delivered
 * - Delivery Failed: When delivery attempt failed
 */

export interface ShippingNotificationData {
  orderNumber: string
  customerName: string
  shopName: string
  trackingNumber: string
  trackingUrl: string
  carrier: string
  estimatedDelivery?: string
  items: Array<{ name: string; quantity: number; imageUrl?: string }>
  deliveryAddress?: {
    city?: string
    state?: string
  }
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
}

/**
 * Generate tracking URL for the email
 */
function getTrackingPageUrl(baseUrl: string, trackingNumber: string): string {
  return `${baseUrl}/tracking/${encodeURIComponent(trackingNumber)}`
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Render shipped email
 */
export function renderShippedEmail(
  data: ShippingNotificationData,
  baseUrl: string = 'https://madebuy.com.au',
): { subject: string; html: string; text: string } {
  const trackingPageUrl = getTrackingPageUrl(baseUrl, data.trackingNumber)

  const subject = `Your order from ${data.shopName} is on its way!`

  const itemsListHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 0;">
        ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}
      </td>
    </tr>
  `,
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="${STYLES.header}">
    <h1 style="${STYLES.headerTitle}">Your Order Has Shipped!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${data.customerName},</p>

    <p>Great news! Your order from <strong>${data.shopName}</strong> is on its way to you.</p>

    <div style="${STYLES.infoBox}">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Tracking Number</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${data.trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Carrier</td>
          <td style="padding: 8px 0; text-align: right;">${data.carrier}</td>
        </tr>
        ${
          data.estimatedDelivery
            ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Estimated Delivery</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatDate(data.estimatedDelivery)}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackingPageUrl}" style="${STYLES.button}">Track Your Package</a>
    </div>

    <div style="${STYLES.infoBox}">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Items in this shipment</h3>
      <table style="width: 100%;">
        ${itemsListHtml}
      </table>
    </div>

    ${
      data.trackingUrl
        ? `
    <p style="text-align: center; font-size: 14px; color: #666;">
      You can also track your package directly on the carrier's website:<br>
      <a href="${data.trackingUrl}" style="color: #7c3aed;">Track on ${data.carrier}</a>
    </p>
    `
        : ''
    }

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Order #${data.orderNumber}<br>
      From ${data.shopName}
    </p>
  </div>

  <p style="${STYLES.footer}">
    Thank you for shopping with MadeBuy sellers!
  </p>
</body>
</html>
  `.trim()

  const text = `
Your Order Has Shipped!

Hi ${data.customerName},

Great news! Your order from ${data.shopName} is on its way to you.

TRACKING INFORMATION
Tracking Number: ${data.trackingNumber}
Carrier: ${data.carrier}
${data.estimatedDelivery ? `Estimated Delivery: ${formatDate(data.estimatedDelivery)}` : ''}

Track your package: ${trackingPageUrl}
${data.trackingUrl ? `Track on ${data.carrier}: ${data.trackingUrl}` : ''}

ITEMS IN THIS SHIPMENT
${data.items.map((item) => `- ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join('\n')}

---
Order #${data.orderNumber}
From ${data.shopName}

Thank you for shopping with MadeBuy sellers!
  `.trim()

  return { subject, html, text }
}

/**
 * Render out for delivery email
 */
export function renderOutForDeliveryEmail(
  data: ShippingNotificationData,
  baseUrl: string = 'https://madebuy.com.au',
): { subject: string; html: string; text: string } {
  const trackingPageUrl = getTrackingPageUrl(baseUrl, data.trackingNumber)

  const subject = `Your order is out for delivery today!`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="${STYLES.headerTitle}">Out for Delivery Today!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${data.customerName},</p>

    <p>Exciting news! Your package from <strong>${data.shopName}</strong> is out for delivery and should arrive today.</p>

    <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 18px; color: #1e40af;">
        Keep an eye out for the delivery driver!
      </p>
    </div>

    <div style="${STYLES.infoBox}">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Tracking Number</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${data.trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Carrier</td>
          <td style="padding: 8px 0; text-align: right;">${data.carrier}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackingPageUrl}" style="${STYLES.button}">Track Your Package</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Order #${data.orderNumber}<br>
      From ${data.shopName}
    </p>
  </div>

  <p style="${STYLES.footer}">
    Thank you for shopping with MadeBuy sellers!
  </p>
</body>
</html>
  `.trim()

  const text = `
Out for Delivery Today!

Hi ${data.customerName},

Exciting news! Your package from ${data.shopName} is out for delivery and should arrive today.

Keep an eye out for the delivery driver!

TRACKING INFORMATION
Tracking Number: ${data.trackingNumber}
Carrier: ${data.carrier}

Track your package: ${trackingPageUrl}

---
Order #${data.orderNumber}
From ${data.shopName}

Thank you for shopping with MadeBuy sellers!
  `.trim()

  return { subject, html, text }
}

/**
 * Render delivered email
 */
export function renderDeliveredEmail(
  data: ShippingNotificationData,
  baseUrl: string = 'https://madebuy.com.au',
): { subject: string; html: string; text: string } {
  const subject = `Your order from ${data.shopName} has been delivered!`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="${STYLES.headerTitle}">Your Package Was Delivered!</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${data.customerName},</p>

    <p>Your order from <strong>${data.shopName}</strong> has been delivered!</p>

    <div style="background: #dcfce7; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 18px; color: #166534;">
        Your package is waiting for you
      </p>
    </div>

    <div style="${STYLES.infoBox}">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Items delivered</h3>
      <table style="width: 100%;">
        ${data.items
          .map(
            (item) => `
        <tr>
          <td style="padding: 8px 0;">
            ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}
          </td>
        </tr>
        `,
          )
          .join('')}
      </table>
    </div>

    <p style="text-align: center; color: #666;">
      Loving your purchase? Consider leaving a review to help other shoppers!
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${baseUrl}" style="${STYLES.button}">Shop More Handmade</a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Order #${data.orderNumber}<br>
      From ${data.shopName}
    </p>
  </div>

  <p style="${STYLES.footer}">
    Thank you for supporting Australian makers on MadeBuy!
  </p>
</body>
</html>
  `.trim()

  const text = `
Your Package Was Delivered!

Hi ${data.customerName},

Your order from ${data.shopName} has been delivered!

Your package is waiting for you.

ITEMS DELIVERED
${data.items.map((item) => `- ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`).join('\n')}

Loving your purchase? Consider leaving a review to help other shoppers!

---
Order #${data.orderNumber}
From ${data.shopName}

Thank you for supporting Australian makers on MadeBuy!
  `.trim()

  return { subject, html, text }
}

/**
 * Render delivery failed email
 */
export function renderDeliveryFailedEmail(
  data: ShippingNotificationData,
  baseUrl: string = 'https://madebuy.com.au',
): { subject: string; html: string; text: string } {
  const trackingPageUrl = getTrackingPageUrl(baseUrl, data.trackingNumber)

  const subject = `Delivery issue with your order from ${data.shopName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="${STYLES.headerTitle}">Delivery Issue</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${data.customerName},</p>

    <p>We're sorry, but there was an issue delivering your package from <strong>${data.shopName}</strong>.</p>

    <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #991b1b;">
        <strong>What happens next?</strong><br>
        The carrier will usually attempt delivery again on the next business day. Please check the tracking details for more information.
      </p>
    </div>

    <div style="${STYLES.infoBox}">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Tracking Number</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${data.trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Carrier</td>
          <td style="padding: 8px 0; text-align: right;">${data.carrier}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackingPageUrl}" style="${STYLES.button}">Check Tracking Details</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center;">
      If you continue to have issues, please contact ${data.shopName} for assistance.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Order #${data.orderNumber}<br>
      From ${data.shopName}
    </p>
  </div>

  <p style="${STYLES.footer}">
    Need help? Contact the seller through MadeBuy.
  </p>
</body>
</html>
  `.trim()

  const text = `
Delivery Issue

Hi ${data.customerName},

We're sorry, but there was an issue delivering your package from ${data.shopName}.

WHAT HAPPENS NEXT?
The carrier will usually attempt delivery again on the next business day. Please check the tracking details for more information.

TRACKING INFORMATION
Tracking Number: ${data.trackingNumber}
Carrier: ${data.carrier}

Check tracking details: ${trackingPageUrl}

If you continue to have issues, please contact ${data.shopName} for assistance.

---
Order #${data.orderNumber}
From ${data.shopName}

Need help? Contact the seller through MadeBuy.
  `.trim()

  return { subject, html, text }
}
