import { messages } from '@madebuy/db'
import type { Message, Order, Tenant } from '@madebuy/shared'
import { Resend } from 'resend'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

/**
 * Escape HTML special characters to prevent XSS in email templates
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

interface MessageNotificationParams {
  order: Order
  tenant: Tenant
  message: Message
  recipientType: 'seller' | 'customer'
}

/**
 * Send message notification email
 * - When customer sends message -> notify seller
 * - When seller sends message -> notify customer
 */
export async function sendMessageNotificationEmail(
  params: MessageNotificationParams,
): Promise<{ success: boolean; error?: string }> {
  const { order, tenant, message, recipientType } = params

  const client = getResendClient()

  if (!client) {
    console.log('[EMAIL] Message notification (not sent - no Resend API key):')
    console.log(`  Recipient: ${recipientType}`)
    console.log(`  Order: ${order.orderNumber}`)
    console.log(`  Preview: ${message.content.substring(0, 100)}...`)
    return { success: true } // Return success in dev mode
  }

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'messages@madebuy.com.au'

  // Build email based on recipient type
  if (recipientType === 'seller') {
    // Notify seller about customer message
    const adminUrl =
      process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.madebuy.com.au'
    const messagesUrl = `${adminUrl}/dashboard/orders/${order.id}/messages`

    const emailHtml = buildSellerNotificationHtml({
      order,
      tenant,
      message,
      messagesUrl,
    })

    try {
      const result = await client.emails.send({
        from: `MadeBuy Messages <${fromEmail}>`,
        to: tenant.email,
        subject: `New message about order ${order.orderNumber}`,
        html: emailHtml,
      })

      if (result.error) {
        console.error('Failed to send seller notification:', result.error)
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to send seller notification email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  } else {
    // Notify customer about seller message
    // First, get or create access token for the order
    const accessToken = await messages.createOrderAccessToken(
      tenant.id,
      order.id,
      order.customerEmail,
    )

    const orderViewUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://madebuy.com.au'}/order/${accessToken.token}`

    const emailHtml = buildCustomerNotificationHtml({
      order,
      tenant,
      message,
      orderViewUrl,
    })

    try {
      const result = await client.emails.send({
        from: `${tenant.businessName} <${fromEmail}>`,
        to: order.customerEmail,
        subject: `${tenant.businessName} replied to your order ${order.orderNumber}`,
        html: emailHtml,
        reply_to: tenant.email,
      })

      if (result.error) {
        console.error('Failed to send customer notification:', result.error)
        return { success: false, error: result.error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Failed to send customer notification email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

function buildSellerNotificationHtml(params: {
  order: Order
  tenant: Tenant
  message: Message
  messagesUrl: string
}): string {
  const { order, tenant, message, messagesUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-top: 0;">New Message</h1>

    <p>Hi ${escapeHtml(tenant.businessName)},</p>

    <p>You have a new message from <strong>${escapeHtml(order.customerName)}</strong> about order <strong>${order.orderNumber}</strong>.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; font-style: italic; color: #374151;">
        "${escapeHtml(message.content.substring(0, 500))}${message.content.length > 500 ? '...' : ''}"
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${messagesUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        View & Reply
      </a>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 14px;">
        This email was sent because you received a message about an order on MadeBuy.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

function buildCustomerNotificationHtml(params: {
  order: Order
  tenant: Tenant
  message: Message
  orderViewUrl: string
}): string {
  const { order, tenant, message, orderViewUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message from ${escapeHtml(tenant.businessName)}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-top: 0;">Message from ${escapeHtml(tenant.businessName)}</h1>

    <p>Hi ${escapeHtml(order.customerName)},</p>

    <p><strong>${escapeHtml(tenant.businessName)}</strong> sent you a message about your order <strong>${order.orderNumber}</strong>.</p>

    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #374151;">
        ${escapeHtml(message.content).replace(/\n/g, '<br>')}
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderViewUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        View Order & Reply
      </a>
    </div>

    <div style="background-color: #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #374151;">
        <strong>Order Summary</strong><br>
        Order: ${order.orderNumber}<br>
        Items: ${order.items.length}<br>
        Total: $${(order.total / 100).toFixed(2)} ${order.currency}
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 14px;">
        This email was sent because you have an order with ${escapeHtml(tenant.businessName)} on MadeBuy.
        You can reply directly through the link above.
      </p>
    </div>
  </div>
</body>
</html>
  `
}
