/**
 * Digital Delivery Service
 *
 * Handles the creation of download records for digital products after purchase.
 * This should be called from the order creation webhook after successful payment.
 */

import type {
  CreateDownloadRecordInput,
  Order,
  OrderItem,
  Piece,
} from '../types'

/**
 * Determine if an order item is for a digital product
 */
export function isDigitalOrderItem(piece: Piece): boolean {
  return (
    piece.digital?.isDigital === true && (piece.digital?.files?.length ?? 0) > 0
  )
}

/**
 * Check if an order contains any digital products
 */
export function orderHasDigitalItems(
  items: Array<{ isDigital?: boolean }>,
): boolean {
  return items.some((item) => item.isDigital)
}

/**
 * Check if an order contains ONLY digital products (no shipping needed)
 */
export function orderIsDigitalOnly(
  items: Array<{ isDigital?: boolean }>,
): boolean {
  return items.length > 0 && items.every((item) => item.isDigital)
}

/**
 * Build download record input from order data
 */
export function buildDownloadRecordInput(
  order: Order,
  _item: OrderItem,
  piece: Piece,
  index: number,
): CreateDownloadRecordInput {
  const digitalConfig = piece.digital!

  return {
    orderId: order.id,
    orderItemId: `${order.id}-item-${index}`,
    pieceId: piece.id,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    maxDownloads: digitalConfig.downloadLimit ?? undefined,
    expiryDays: digitalConfig.downloadExpiryDays ?? undefined,
  }
}

/**
 * Generate download page URL
 */
export function getDownloadPageUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/downloads/${token}`
}

/**
 * Generate download API URL for a specific file
 */
export function getFileDownloadUrl(
  baseUrl: string,
  token: string,
  fileId: string,
): string {
  return `${baseUrl}/api/downloads/${token}?file=${fileId}`
}

/**
 * Format download email content
 */
export interface DownloadEmailData {
  customerName: string
  productName: string
  downloadPageUrl: string
  files: Array<{
    name: string
    fileName: string
    sizeBytes: number
    directDownloadUrl: string
  }>
  expiryDate?: Date
  downloadLimit?: number
  sellerName: string
  orderNumber: string
}

export function buildDownloadEmailHtml(data: DownloadEmailData): string {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  const fileListHtml = data.files
    .map(
      (file) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${file.name}</strong><br>
        <span style="color: #666; font-size: 12px;">${file.fileName} &bull; ${formatFileSize(file.sizeBytes)}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        <a href="${file.directDownloadUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">Download</a>
      </td>
    </tr>
  `,
    )
    .join('')

  const expiryNote = data.expiryDate
    ? `<p style="color: #666; font-size: 14px;">This link expires on ${data.expiryDate.toLocaleDateString('en-AU', { dateStyle: 'long' })}.</p>`
    : ''

  const limitNote = data.downloadLimit
    ? `<p style="color: #666; font-size: 14px;">You can download each file up to ${data.downloadLimit} times.</p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Download is Ready!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
    <p>Hi ${data.customerName},</p>

    <p>Thank you for your purchase! Your digital product <strong>${data.productName}</strong> is ready to download.</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px;">Your Files</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${fileListHtml}
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.downloadPageUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View All Downloads</a>
    </div>

    ${expiryNote}
    ${limitNote}

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      Order #${data.orderNumber}<br>
      From ${data.sellerName}
    </p>
  </div>

  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
    Having trouble? Reply to this email for assistance.
  </p>
</body>
</html>
  `.trim()
}

export function buildDownloadEmailText(data: DownloadEmailData): string {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  const fileList = data.files
    .map(
      (file) =>
        `- ${file.name} (${formatFileSize(file.sizeBytes)})\n  Download: ${file.directDownloadUrl}`,
    )
    .join('\n\n')

  let text = `Your Download is Ready!

Hi ${data.customerName},

Thank you for your purchase! Your digital product "${data.productName}" is ready to download.

YOUR FILES:
${fileList}

View all downloads: ${data.downloadPageUrl}
`

  if (data.expiryDate) {
    text += `\nNote: This link expires on ${data.expiryDate.toLocaleDateString('en-AU', { dateStyle: 'long' })}.`
  }

  if (data.downloadLimit) {
    text += `\nYou can download each file up to ${data.downloadLimit} times.`
  }

  text += `

---
Order #${data.orderNumber}
From ${data.sellerName}

Having trouble? Reply to this email for assistance.
`

  return text.trim()
}
