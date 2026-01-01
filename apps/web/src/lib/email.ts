import { Resend } from 'resend'
import type { Order, Tenant, DownloadRecord, DigitalFile } from '@madebuy/shared'
import {
  buildDownloadEmailHtml,
  buildDownloadEmailText,
  getDownloadPageUrl,
  getFileDownloadUrl,
  type DownloadEmailData,
} from '@madebuy/shared'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

function formatCurrency(amount: number | undefined, currency: string): string {
  if (amount === undefined) return 'N/A'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
  }).format(amount)
}

export async function sendOrderConfirmation(order: Order, tenant: Tenant) {
  const fromEmail = tenant.email || process.env.DEFAULT_FROM_EMAIL || 'orders@madebuy.com.au'

  // Build order items HTML
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity, order.currency)}</td>
    </tr>
  `
    )
    .join('')

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-top: 0;">Order Confirmation</h1>

    <p>Hi ${order.customerName || 'there'},</p>

    <p>Thank you for your order from <strong>${tenant.businessName}</strong>!</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Order Details</h2>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}</p>
    </div>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Items</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
        <tr>
          <td style="padding: 12px; padding-top: 20px;"><strong>Subtotal</strong></td>
          <td style="padding: 12px; padding-top: 20px; text-align: right;">${formatCurrency(order.subtotal, order.currency)}</td>
        </tr>
        <tr>
          <td style="padding: 12px;">Shipping</td>
          <td style="padding: 12px; text-align: right;">${formatCurrency(order.shipping, order.currency)}</td>
        </tr>
        ${
          order.tax > 0
            ? `
        <tr>
          <td style="padding: 12px;">Tax</td>
          <td style="padding: 12px; text-align: right;">${formatCurrency(order.tax, order.currency)}</td>
        </tr>
        `
            : ''
        }
        ${
          order.discount > 0
            ? `
        <tr>
          <td style="padding: 12px;">Discount</td>
          <td style="padding: 12px; text-align: right;">-${formatCurrency(order.discount, order.currency)}</td>
        </tr>
        `
            : ''
        }
        <tr style="font-size: 18px; font-weight: bold;">
          <td style="padding: 12px; padding-top: 20px; border-top: 2px solid #2563eb;">Total</td>
          <td style="padding: 12px; padding-top: 20px; text-align: right; border-top: 2px solid #2563eb;">${formatCurrency(order.total, order.currency)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Shipping Address</h2>
      <p style="margin: 5px 0;">${order.shippingAddress.line1}</p>
      ${order.shippingAddress.line2 ? `<p style="margin: 5px 0;">${order.shippingAddress.line2}</p>` : ''}
      <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postcode}</p>
      <p style="margin: 5px 0;">${order.shippingAddress.country}</p>
    </div>

    ${
      order.customerNotes
        ? `
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Order Notes</h2>
      <p>${order.customerNotes}</p>
    </div>
    `
        : ''
    }

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p>If you have any questions about your order, please contact us at <a href="mailto:${fromEmail}" style="color: #2563eb;">${fromEmail}</a></p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `

  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping email send')
    return null
  }

  try {
    const result = await client.emails.send({
      from: `${tenant.businessName} <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: emailHtml,
    })

    console.log('Order confirmation email sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    throw error
  }
}

/**
 * Send digital product download email
 */
export interface SendDownloadEmailParams {
  order: Order
  tenant: Tenant
  downloadRecord: DownloadRecord
  productName: string
  files: DigitalFile[]
  downloadLimit?: number
  expiryDate?: Date
}

export async function sendDownloadEmail(params: SendDownloadEmailParams) {
  const { order, tenant, downloadRecord, productName, files, downloadLimit, expiryDate } = params

  const fromEmail = tenant.email || process.env.DEFAULT_FROM_EMAIL || 'orders@madebuy.com.au'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${tenant.slug}.madebuy.com.au`

  const downloadPageUrl = getDownloadPageUrl(baseUrl, downloadRecord.downloadToken)

  const emailData: DownloadEmailData = {
    customerName: order.customerName || 'there',
    productName,
    downloadPageUrl,
    files: files.map(file => ({
      name: file.name,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      directDownloadUrl: getFileDownloadUrl(baseUrl, downloadRecord.downloadToken, file.id),
    })),
    expiryDate,
    downloadLimit,
    sellerName: tenant.shopName || tenant.businessName || 'the seller',
    orderNumber: order.orderNumber,
  }

  const htmlContent = buildDownloadEmailHtml(emailData)
  const textContent = buildDownloadEmailText(emailData)

  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping download email')
    return null
  }

  try {
    const result = await client.emails.send({
      from: `${tenant.businessName || tenant.shopName} <${fromEmail}>`,
      to: order.customerEmail,
      subject: `Your Download: ${productName}`,
      html: htmlContent,
      text: textContent,
    })

    console.log('Download email sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send download email:', error)
    throw error
  }
}
