import type { LowStockPiece } from '@madebuy/db'
import type {
  DigitalFile,
  DisputeReason,
  DownloadRecord,
  Order,
  Tenant,
} from '@madebuy/shared'
import {
  buildDownloadEmailHtml,
  buildDownloadEmailText,
  type DownloadEmailData,
  getDownloadPageUrl,
  getFileDownloadUrl,
} from '@madebuy/shared'
import { Resend } from 'resend'
import type Stripe from 'stripe'

let resend: Resend | null = null

/**
 * Escape HTML special characters to prevent XSS in email templates
 * (P1 security fix)
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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
  const fromEmail =
    tenant.email || process.env.DEFAULT_FROM_EMAIL || 'orders@madebuy.com.au'

  // Build order items HTML (escaping item names for XSS prevention)
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(item.name)} x ${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity, order.currency)}</td>
    </tr>
  `,
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
      <p><strong>Order Date:</strong> ${new Date(
        order.createdAt,
      ).toLocaleDateString('en-AU', {
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
      <p>${escapeHtml(order.customerNotes)}</p>
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
  const {
    order,
    tenant,
    downloadRecord,
    productName,
    files,
    downloadLimit,
    expiryDate,
  } = params

  const fromEmail =
    tenant.email || process.env.DEFAULT_FROM_EMAIL || 'orders@madebuy.com.au'
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `https://${tenant.slug}.madebuy.com.au`

  const downloadPageUrl = getDownloadPageUrl(
    baseUrl,
    downloadRecord.downloadToken,
  )

  const emailData: DownloadEmailData = {
    customerName: order.customerName || 'there',
    productName,
    downloadPageUrl,
    files: files.map((file) => ({
      name: file.name,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      directDownloadUrl: getFileDownloadUrl(
        baseUrl,
        downloadRecord.downloadToken,
        file.id,
      ),
    })),
    expiryDate,
    downloadLimit,
    sellerName: tenant.businessName || 'the seller',
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
      from: `${tenant.businessName} <${fromEmail}>`,
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

/**
 * Send payment failed notification email to tenant
 */
export interface PaymentFailedEmailParams {
  tenant: Tenant
  invoice: Stripe.Invoice
  attemptCount: number
  nextRetryDate?: Date
}

export async function sendPaymentFailedEmail(params: PaymentFailedEmailParams) {
  const { tenant, invoice, attemptCount, nextRetryDate } = params

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'billing@madebuy.com.au'
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.madebuy.com.au'
  const amountDue = formatCurrency(
    (invoice.amount_due || 0) / 100,
    invoice.currency?.toUpperCase() || 'AUD',
  )

  // Stripe portal link for updating payment method
  const updatePaymentUrl = `${adminUrl}/dashboard/settings/billing`

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef2f2; padding: 30px; border-radius: 10px; border: 1px solid #fecaca;">
    <h1 style="color: #dc2626; margin-top: 0;">Payment Failed</h1>

    <p>Hi ${tenant.businessName},</p>

    <p>We were unable to process your subscription payment of <strong>${amountDue}</strong>.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Payment Details</h2>
      <p><strong>Amount:</strong> ${amountDue}</p>
      <p><strong>Invoice ID:</strong> ${invoice.id}</p>
      <p><strong>Attempt:</strong> ${attemptCount} of 4</p>
      ${
        nextRetryDate
          ? `<p><strong>Next Retry:</strong> ${nextRetryDate.toLocaleDateString(
              'en-AU',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              },
            )}</p>`
          : ''
      }
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #fcd34d;">
      <h3 style="margin-top: 0; color: #92400e;">What happens next?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Stripe will automatically retry payment up to 4 times over the next 3 weeks</li>
        <li>If all retries fail, your subscription will be cancelled</li>
        <li>Your storefront will remain active during the retry period</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${updatePaymentUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Update Payment Method
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      To avoid any interruption to your service, please update your payment method as soon as possible.
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, please contact us at <a href="mailto:support@madebuy.com.au" style="color: #2563eb;">support@madebuy.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>
  `

  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping payment failed email')
    return null
  }

  try {
    const result = await client.emails.send({
      from: `MadeBuy Billing <${fromEmail}>`,
      to: tenant.email,
      subject: `Action Required: Payment Failed for your MadeBuy Subscription`,
      html: emailHtml,
    })

    console.log('Payment failed email sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send payment failed email:', error)
    throw error
  }
}

/**
 * Send payout failed notification email to tenant
 * Notifies seller when their bank payout fails
 */
export interface PayoutFailedEmailParams {
  tenant: Tenant
  payout: Stripe.Payout
  failureReason: string | null
  bankAccountLast4?: string | null
}

export async function sendPayoutFailedEmail(params: PayoutFailedEmailParams) {
  const { tenant, payout, failureReason, bankAccountLast4 } = params

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'billing@madebuy.com.au'
  const amount = formatCurrency(
    payout.amount / 100,
    payout.currency?.toUpperCase() || 'AUD',
  )

  // Link to Stripe Express dashboard where they can update bank details
  const stripeDashboardUrl = 'https://connect.stripe.com/express_login'

  const failureMessage = getPayoutFailureDescription(
    payout.failure_code || null,
    failureReason,
  )

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef2f2; padding: 30px; border-radius: 10px; border: 1px solid #fecaca;">
    <h1 style="color: #dc2626; margin-top: 0;">Payout Failed</h1>

    <p>Hi ${tenant.businessName},</p>

    <p>We were unable to send your payout of <strong>${amount}</strong> to your bank account.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Payout Details</h2>
      <p><strong>Amount:</strong> ${amount}</p>
      ${bankAccountLast4 ? `<p><strong>Bank Account:</strong> ****${bankAccountLast4}</p>` : ''}
      <p><strong>Reason:</strong> ${failureMessage}</p>
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #fcd34d;">
      <h3 style="margin-top: 0; color: #92400e;">What should I do?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Check that your bank account details are correct in your Stripe dashboard</li>
        <li>Ensure your account can receive the transfer amount</li>
        <li>Contact your bank if the details are correct but transfers are failing</li>
        <li>Once resolved, future payouts will process automatically</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${stripeDashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Update Bank Details
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      The failed payout amount will remain in your Stripe balance. Once your bank details are updated, Stripe will automatically retry the payout.
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, please contact us at <a href="mailto:support@madebuy.com.au" style="color: #2563eb;">support@madebuy.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>
  `

  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping payout failed email')
    return null
  }

  try {
    const result = await client.emails.send({
      from: `MadeBuy Payouts <${fromEmail}>`,
      to: tenant.email,
      subject: `Action Required: Payout of ${amount} Failed`,
      html: emailHtml,
    })

    console.log('Payout failed email sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send payout failed email:', error)
    throw error
  }
}

/**
 * Get human-readable description for payout failure codes
 */
function getPayoutFailureDescription(
  failureCode: string | null,
  failureMessage: string | null,
): string {
  // If we have a specific failure message from Stripe, use it
  if (failureMessage) {
    return failureMessage
  }

  // Map common failure codes to user-friendly messages
  switch (failureCode) {
    case 'account_closed':
      return 'The bank account has been closed'
    case 'account_frozen':
      return 'The bank account has been frozen'
    case 'bank_account_restricted':
      return 'The bank account has restrictions that prevent this transfer'
    case 'bank_ownership_changed':
      return 'The bank account ownership has changed'
    case 'could_not_process':
      return 'The bank could not process this transfer'
    case 'debit_not_authorized':
      return 'The debit was not authorized by the account holder'
    case 'declined':
      return 'The transfer was declined by the bank'
    case 'incorrect_account_holder_address':
      return 'The account holder address on file does not match the bank records'
    case 'incorrect_account_holder_name':
      return 'The account holder name on file does not match the bank records'
    case 'incorrect_account_holder_tax_id':
      return 'The account holder tax ID does not match bank records'
    case 'insufficient_funds':
      return 'Insufficient funds in the Stripe balance'
    case 'invalid_account_number':
      return 'The bank account number is invalid'
    case 'invalid_currency':
      return 'The bank account cannot receive this currency'
    case 'no_account':
      return 'No bank account exists with these details'
    case 'unsupported_card':
      return 'This card type is not supported for payouts'
    default:
      return 'The payout could not be completed. Please check your bank details.'
  }
}

/**
 * Send dispute notification email to tenant
 * Notifies seller when a chargeback/dispute is filed against them
 */
export interface DisputeNotificationEmailParams {
  tenant: Tenant
  dispute: Stripe.Dispute
  evidenceDueBy: Date | null
}

export async function sendDisputeNotificationEmail(
  params: DisputeNotificationEmailParams,
) {
  const { tenant, dispute, evidenceDueBy } = params

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'billing@madebuy.com.au'
  const amount = formatCurrency(
    dispute.amount / 100,
    dispute.currency?.toUpperCase() || 'AUD',
  )

  // Link to Stripe dashboard for responding to dispute
  const stripeDashboardUrl = `https://dashboard.stripe.com/disputes/${dispute.id}`
  const reasonDescription = getDisputeReasonDescription(
    dispute.reason as DisputeReason,
  )

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dispute Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef2f2; padding: 30px; border-radius: 10px; border: 1px solid #fecaca;">
    <h1 style="color: #dc2626; margin-top: 0;">Dispute Alert: Action Required</h1>

    <p>Hi ${tenant.businessName},</p>

    <p>A customer has filed a dispute (chargeback) for <strong>${amount}</strong> on one of your orders.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Dispute Details</h2>
      <p><strong>Amount:</strong> ${amount}</p>
      <p><strong>Reason:</strong> ${reasonDescription}</p>
      <p><strong>Status:</strong> Needs Response</p>
      ${
        evidenceDueBy
          ? `<p><strong>Evidence Deadline:</strong> ${evidenceDueBy.toLocaleDateString(
              'en-AU',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )}</p>`
          : ''
      }
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #fcd34d;">
      <h3 style="margin-top: 0; color: #92400e;">What should I do?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Review the dispute in your Stripe dashboard</li>
        <li>Gather evidence: Order confirmation, shipping proof, customer communications</li>
        <li>Submit your response before the deadline</li>
        <li>If you don't respond, you will automatically lose the dispute</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${stripeDashboardUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Respond to Dispute
      </a>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        <strong>Note:</strong> Disputes are costly for your business. If you lose, you will forfeit the ${amount} plus a dispute fee.
        Responding promptly with strong evidence significantly improves your chances of winning.
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 14px;">
        Need help responding to this dispute? Contact us at <a href="mailto:support@madebuy.com.au" style="color: #2563eb;">support@madebuy.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>
  `

  const client = getResendClient()

  if (!client) {
    console.warn(
      'Resend API key not configured, skipping dispute notification email',
    )
    return null
  }

  try {
    const result = await client.emails.send({
      from: `MadeBuy Disputes <${fromEmail}>`,
      to: tenant.email,
      subject: `URGENT: Dispute for ${amount} - Action Required`,
      html: emailHtml,
    })

    console.log('Dispute notification email sent:', result)
    return result
  } catch (error) {
    console.error('Failed to send dispute notification email:', error)
    throw error
  }
}

/**
 * Get human-readable description for dispute reasons
 */
function getDisputeReasonDescription(reason: DisputeReason): string {
  switch (reason) {
    case 'bank_cannot_process':
      return 'Bank cannot process the transaction'
    case 'credit_not_processed':
      return 'Customer claims credit was not processed'
    case 'customer_initiated':
      return 'Customer-initiated dispute'
    case 'debit_not_authorized':
      return 'Debit not authorized by customer'
    case 'duplicate':
      return 'Duplicate transaction'
    case 'fraudulent':
      return 'Customer claims transaction is fraudulent'
    case 'general':
      return 'General dispute'
    case 'incorrect_account_details':
      return 'Incorrect account details'
    case 'insufficient_funds':
      return 'Insufficient funds'
    case 'product_not_received':
      return 'Customer claims product was not received'
    case 'product_unacceptable':
      return 'Customer claims product is unacceptable'
    case 'subscription_canceled':
      return 'Customer claims subscription was canceled'
    case 'unrecognized':
      return 'Customer does not recognize the transaction'
    default:
      return 'Unknown reason'
  }
}

// =============================================================================
// LOW STOCK ALERTS
// =============================================================================

/**
 * Low stock alert email data
 */
interface LowStockAlertEmailData {
  tenant: Tenant
  pieces: LowStockPiece[]
  dashboardUrl: string
}

/**
 * Build low stock alert email HTML
 */
function buildLowStockAlertEmailHtml(data: LowStockAlertEmailData): string {
  const { tenant, pieces, dashboardUrl } = data
  const shopName = tenant.businessName || 'Your Shop'

  const itemsHtml = pieces
    .map((piece) => {
      const stockStatus =
        piece.stock === 0
          ? '<span style="color: #dc2626; font-weight: 600;">OUT OF STOCK</span>'
          : `<span style="color: #d97706; font-weight: 600;">${piece.stock} left</span>`

      return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <div>
          <p style="margin: 0; font-weight: 500; color: #111827;">${escapeHtml(piece.name)}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${escapeHtml(piece.category)} | ${escapeHtml(piece.status)}</p>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${stockStatus}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
        ${piece.lowStockThreshold}
      </td>
    </tr>
  `
    })
    .join('')

  const outOfStockCount = pieces.filter((p) => p.stock === 0).length
  const lowStockCount = pieces.filter((p) => p.stock > 0).length

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Stock Alert</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
  <div style="padding: 40px 20px;">
    <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background-color: #d97706; padding: 30px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Low Stock Alert</h1>
      </div>

      <div style="padding: 30px 24px;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Hi ${escapeHtml(shopName)},
        </p>

        <p style="margin: 0 0 20px 0; font-size: 16px;">
          The following items in your inventory need attention:
        </p>

        <!-- Summary -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          ${
            outOfStockCount > 0
              ? `
          <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626;">${outOfStockCount}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b;">Out of Stock</p>
          </div>
          `
              : ''
          }
          ${
            lowStockCount > 0
              ? `
          <div style="flex: 1; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #d97706;">${lowStockCount}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">Low Stock</p>
          </div>
          `
              : ''
          }
        </div>

        <!-- Items Table -->
        <div style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e5e7eb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase;">Item</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase;">Stock</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase;">Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #d97706; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Low Stock Items
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          This is an automated alert from ${shopName} on MadeBuy.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
          Manage your stock thresholds in your dashboard settings.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send low stock alert email to tenant
 */
export async function sendLowStockAlertEmail(
  data: LowStockAlertEmailData,
): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    // In development mode without Resend, log to console
    console.log('[EMAIL] Low stock alert email (not sent - no Resend API key):')
    console.log(`  To: ${data.tenant.email}`)
    console.log(`  Items: ${data.pieces.length}`)
    console.log(
      `  Out of stock: ${data.pieces.filter((p) => p.stock === 0).length}`,
    )
    console.log(`  Low stock: ${data.pieces.filter((p) => p.stock > 0).length}`)
    return {
      success: true, // Return success in dev mode for testing
    }
  }

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'alerts@madebuy.com.au'
  const htmlContent = buildLowStockAlertEmailHtml(data)

  try {
    const result = await client.emails.send({
      from: `MadeBuy Alerts <${fromEmail}>`,
      to: data.tenant.email,
      subject: `Low Stock Alert: ${data.pieces.length} item${data.pieces.length === 1 ? '' : 's'} need attention`,
      html: htmlContent,
    })

    if (result.error) {
      console.error('Failed to send low stock alert email:', result.error)
      return {
        success: false,
        error: result.error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send low stock alert email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send subscription cancellation notification email to tenant
 */
export interface SubscriptionCancelledEmailParams {
  tenant: {
    email: string
    businessName?: string
    name?: string
  }
  planName: string
  lastDayOfService: Date
}

export async function sendSubscriptionCancelledEmail(
  params: SubscriptionCancelledEmailParams,
): Promise<void> {
  const { tenant, planName, lastDayOfService } = params

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'billing@madebuy.com.au'

  const formattedDate = lastDayOfService.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #374151; margin-top: 0;">Subscription Cancelled</h1>

    <p>Hi ${tenant.businessName || tenant.name || 'there'},</p>

    <p>Your <strong>${planName}</strong> subscription has been cancelled as of ${formattedDate}.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #374151;">Your Free Plan Features</h2>
      <p>Your account has been downgraded to the <strong>Free</strong> plan. You still have access to:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Up to 10 products</li>
        <li>Basic storefront</li>
        <li>Order management</li>
      </ul>
    </div>

    <div style="background-color: #dbeafe; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #93c5fd;">
      <h3 style="margin-top: 0; color: #1e40af;">Your Data is Safe</h3>
      <p style="margin: 0;">
        All your data has been retained. You can resubscribe at any time to unlock premium features and continue growing your business.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://admin.madebuy.com.au/dashboard/settings/billing" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Resubscribe Now
      </a>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p>Thanks for being a MadeBuy seller! We hope to see you back soon.</p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        If you have any questions, please contact us at <a href="mailto:support@madebuy.com.au" style="color: #2563eb;">support@madebuy.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>
  `

  const client = getResendClient()

  if (!client) {
    console.warn(
      'Resend API key not configured, skipping subscription cancelled email',
    )
    return
  }

  try {
    const result = await client.emails.send({
      from: `MadeBuy Billing <${fromEmail}>`,
      to: tenant.email,
      subject: 'Your MadeBuy subscription has ended',
      html: emailHtml,
    })

    console.log('Subscription cancelled email sent:', result)
  } catch (error) {
    console.error('Failed to send subscription cancelled email:', error)
    throw error
  }
}
