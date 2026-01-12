import { Resend } from 'resend'
import type { Tenant, Newsletter, NewsletterTemplate, Order } from '@madebuy/shared'
import type { LowStockPiece } from '@madebuy/db'
import { renderShippedEmail } from '@madebuy/shared'

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

interface SendNewsletterResult {
  success: boolean
  sentCount: number
  errors: Array<{ email: string; error: string }>
}

/**
 * Build newsletter HTML with template styling
 */
function buildNewsletterHtml(
  newsletter: Newsletter,
  template: NewsletterTemplate,
  tenant: Tenant
): string {
  const { header, colors, footer, sections } = template
  const logoUrl = tenant.logoMediaId ? '' : '' // Logo URL would need to be fetched from media storage

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newsletter.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${colors.text}; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${colors.background};">
  <div style="padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background-color: ${colors.primary}; border-radius: 10px 10px 0 0;">
      ${header.showLogo && logoUrl ? `<img src="${logoUrl}" alt="${tenant.businessName}" style="max-width: 200px; max-height: 60px; margin-bottom: 10px;" />` : ''}
      ${header.headerText ? `<h1 style="color: white; margin: 0; font-size: 24px;">${header.headerText}</h1>` : ''}
      ${header.tagline ? `<p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">${header.tagline}</p>` : ''}
    </div>

    <!-- Content -->
    <div style="background-color: white; padding: 30px 20px;">
      ${sections.showGreeting && header.greetingText ? `<p style="margin-bottom: 20px;">${header.greetingText}</p>` : ''}

      <div class="newsletter-content">
        ${escapeHtml(newsletter.content)}
      </div>

      ${newsletter.images && newsletter.images.length > 0 ? `
        <div style="margin-top: 20px;">
          ${newsletter.images.map(img => `
            <div style="margin-bottom: 15px;">
              <!-- Image would need URL resolved from mediaId: ${img.mediaId} -->
              ${img.caption ? `<p style="color: ${colors.text}; font-size: 14px; margin-top: 5px; text-align: center;">${img.caption}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${sections.showCtaButton && sections.ctaButtonUrl ? `
        <div style="text-align: center; margin-top: 30px;">
          <a href="${sections.ctaButtonUrl}" style="display: inline-block; background-color: ${colors.accent}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ${sections.ctaButtonText || 'Shop Now'}
          </a>
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 30px 20px; border-radius: 0 0 10px 10px; text-align: center;">
      ${footer.signatureText ? `<p style="margin: 0;">${footer.signatureText}</p>` : ''}
      ${footer.signatureName ? `<p style="margin: 5px 0; font-weight: bold;">${footer.signatureName}</p>` : ''}
      ${footer.signatureTitle ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${footer.signatureTitle}</p>` : ''}

      ${footer.showSocialLinks && (tenant.instagram || tenant.facebook) ? `
        <div style="margin-top: 20px;">
          ${tenant.instagram ? `<a href="https://instagram.com/${tenant.instagram}" style="color: ${colors.primary}; margin: 0 10px;">Instagram</a>` : ''}
          ${tenant.facebook ? `<a href="https://facebook.com/${tenant.facebook}" style="color: ${colors.primary}; margin: 0 10px;">Facebook</a>` : ''}
          ${tenant.tiktok ? `<a href="https://tiktok.com/@${tenant.tiktok}" style="color: ${colors.primary}; margin: 0 10px;">TikTok</a>` : ''}
        </div>
      ` : ''}

      ${footer.footerText ? `<p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">${footer.footerText}</p>` : ''}

      <p style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
        You received this email because you're subscribed to updates from ${tenant.businessName}.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send newsletter to a list of email addresses
 */
export async function sendNewsletter(
  newsletter: Newsletter,
  template: NewsletterTemplate,
  tenant: Tenant,
  recipients: Array<{ email: string; name?: string }>
): Promise<SendNewsletterResult> {
  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping newsletter send')
    return {
      success: false,
      sentCount: 0,
      errors: [{ email: 'all', error: 'Email service not configured' }],
    }
  }

  const fromEmail = tenant.email || process.env.DEFAULT_FROM_EMAIL || 'newsletter@madebuy.com.au'
  const fromName = tenant.businessName || 'Newsletter'
  const htmlContent = buildNewsletterHtml(newsletter, template, tenant)

  const errors: Array<{ email: string; error: string }> = []
  let sentCount = 0

  // Resend supports batch sending with up to 100 emails at a time
  const batchSize = 100
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    try {
      const result = await client.batch.send(
        batch.map((recipient) => ({
          from: `${fromName} <${fromEmail}>`,
          to: recipient.email,
          subject: newsletter.subject,
          html: htmlContent,
        }))
      )

      // Check for individual failures in the batch
      if (result.data) {
        sentCount += batch.length
      }

      if (result.error) {
        // Batch failed entirely
        batch.forEach((recipient) => {
          errors.push({ email: recipient.email, error: result.error?.message || 'Batch send failed' })
        })
      }
    } catch (error) {
      console.error('Failed to send newsletter batch:', error)
      batch.forEach((recipient) => {
        errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    errors,
  }
}

interface ShippingEmailData {
  order: Order
  tenant: Tenant
  trackingNumber: string
  trackingUrl: string
  carrier: string
  estimatedDeliveryDays?: { min: number; max: number }
}

/**
 * Send shipping notification email to customer
 */
export async function sendShippingNotificationEmail(data: ShippingEmailData): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    console.warn('Resend API key not configured, skipping shipping notification email')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  // Calculate estimated delivery date from days
  let estimatedDelivery: string | undefined
  if (data.estimatedDeliveryDays) {
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + data.estimatedDeliveryDays.max)
    estimatedDelivery = deliveryDate.toISOString()
  }

  // Build email data
  const emailData = {
    orderNumber: data.order.orderNumber,
    customerName: data.order.customerName,
    shopName: data.tenant.businessName,
    trackingNumber: data.trackingNumber,
    trackingUrl: data.trackingUrl,
    carrier: data.carrier,
    estimatedDelivery,
    items: data.order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    })),
  }

  // Render the email
  const baseUrl = data.tenant.customDomain
    ? `https://${data.tenant.customDomain}`
    : `https://madebuy.com.au/${data.tenant.slug}`
  const { subject, html, text } = renderShippedEmail(emailData, baseUrl)

  // Determine from email
  const fromEmail = process.env.SHIPPING_FROM_EMAIL || process.env.DEFAULT_FROM_EMAIL || 'shipping@madebuy.com.au'
  const fromName = data.tenant.businessName

  try {
    const result = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.order.customerEmail,
      subject,
      html,
      text,
      reply_to: data.tenant.email,
    })

    if (result.error) {
      console.error('Failed to send shipping notification:', result.error)
      return {
        success: false,
        error: result.error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send shipping notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Abandoned cart email data
 */
interface AbandonedCartEmailData {
  cart: {
    id: string
    customerEmail: string
    items: Array<{
      name: string
      price: number
      quantity: number
      imageUrl?: string
    }>
    total: number
    currency: string
  }
  tenant: Tenant
  recoveryUrl: string
  unsubscribeUrl?: string
}

/**
 * Build abandoned cart email HTML
 */
function buildAbandonedCartEmailHtml(data: AbandonedCartEmailData): string {
  const { cart, tenant, recoveryUrl } = data
  const shopName = tenant.businessName || 'Our Shop'
  const brandColor = tenant.primaryColor || '#3B82F6'

  const itemsHtml = cart.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 12px;" />` : ''}
          <div>
            <p style="margin: 0; font-weight: 500; color: #111827;">${item.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Qty: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">
        $${(item.price / 100).toFixed(2)}
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You left something behind!</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
  <div style="padding: 40px 20px;">
    <!-- Header -->
    <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background-color: ${brandColor}; padding: 30px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Did you forget something?</h1>
      </div>

      <div style="padding: 30px 24px;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Hi there! We noticed you left some items in your cart at <strong>${shopName}</strong>.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px;">
          Good news - your cart is still waiting for you! Complete your purchase now before these items sell out.
        </p>

        <!-- Cart Items -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 16px 0 0 0; font-weight: 600; font-size: 18px; color: #111827;">
                  Total
                </td>
                <td style="padding: 16px 0 0 0; text-align: right; font-weight: 600; font-size: 18px; color: #111827;">
                  $${(cart.total / 100).toFixed(2)} ${cart.currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${recoveryUrl}" style="display: inline-block; background-color: ${brandColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Complete Your Purchase
          </a>
        </div>

        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
          Or copy this link: <a href="${recoveryUrl}" style="color: ${brandColor};">${recoveryUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          This email was sent by ${shopName} because you started checkout but didn't complete it.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
          If you have any questions, please reply to this email.
        </p>
        ${data.unsubscribeUrl ? `
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #9ca3af;">
          Don't want to receive these emails? <a href="${data.unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
        </p>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send abandoned cart recovery email
 */
export async function sendAbandonedCartEmail(data: AbandonedCartEmailData): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    // In development mode without Resend, log to console
    console.log('[EMAIL] Abandoned cart recovery email (not sent - no Resend API key):')
    console.log(`  To: ${data.cart.customerEmail}`)
    console.log(`  Recovery URL: ${data.recoveryUrl}`)
    console.log(`  Cart Total: $${(data.cart.total / 100).toFixed(2)}`)
    console.log(`  Items: ${data.cart.items.map(i => i.name).join(', ')}`)
    return {
      success: true, // Return success in dev mode for testing
    }
  }

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'hello@madebuy.com.au'
  const fromName = data.tenant.businessName || 'MadeBuy'
  const htmlContent = buildAbandonedCartEmailHtml(data)

  try {
    const result = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.cart.customerEmail,
      subject: `You left items in your cart at ${data.tenant.businessName}!`,
      html: htmlContent,
      reply_to: data.tenant.email,
    })

    if (result.error) {
      console.error('Failed to send abandoned cart email:', result.error)
      return {
        success: false,
        error: result.error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send abandoned cart email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Review request email data
 */
interface ReviewRequestEmailData {
  order: {
    id: string
    orderNumber: string
    customerEmail: string
    customerName: string
    items: Array<{
      name: string
      imageUrl?: string
    }>
  }
  tenant: Tenant
  reviewUrl: string
  unsubscribeUrl?: string
}

/**
 * Build review request email HTML
 */
function buildReviewRequestEmailHtml(data: ReviewRequestEmailData): string {
  const { order, tenant, reviewUrl } = data
  const shopName = tenant.businessName || 'Our Shop'
  const brandColor = tenant.primaryColor || '#3B82F6'

  const itemsHtml = order.items.slice(0, 3).map(item => `
    <div style="display: inline-block; margin-right: 12px; margin-bottom: 12px; text-align: center;">
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` : ''}
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</p>
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your order?</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
  <div style="padding: 40px 20px;">
    <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background-color: ${brandColor}; padding: 30px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">How was your order?</h1>
      </div>

      <div style="padding: 30px 24px;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Hi ${order.customerName || 'there'},
        </p>

        <p style="margin: 0 0 20px 0; font-size: 16px;">
          We hope you're enjoying your purchase from <strong>${shopName}</strong>! Your feedback helps us improve and helps other shoppers make confident decisions.
        </p>

        <!-- Order Items Preview -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">
            Order #${order.orderNumber}
          </p>
          <div>
            ${itemsHtml}
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${reviewUrl}" style="display: inline-block; background-color: ${brandColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Leave a Review
          </a>
        </div>

        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
          It only takes a minute and means so much to us!
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Thank you for shopping with ${shopName}!
        </p>
        ${data.unsubscribeUrl ? `
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #9ca3af;">
          Don't want to receive these emails? <a href="${data.unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
        </p>
        ` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send review request email
 */
export async function sendReviewRequestEmail(data: ReviewRequestEmailData): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    // In development mode without Resend, log to console
    console.log('[EMAIL] Review request email (not sent - no Resend API key):')
    console.log(`  To: ${data.order.customerEmail}`)
    console.log(`  Order: ${data.order.orderNumber}`)
    console.log(`  Review URL: ${data.reviewUrl}`)
    return {
      success: true, // Return success in dev mode for testing
    }
  }

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'hello@madebuy.com.au'
  const fromName = data.tenant.businessName || 'MadeBuy'
  const htmlContent = buildReviewRequestEmailHtml(data)

  try {
    const result = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.order.customerEmail,
      subject: `How was your order from ${data.tenant.businessName}?`,
      html: htmlContent,
      reply_to: data.tenant.email,
    })

    if (result.error) {
      console.error('Failed to send review request email:', result.error)
      return {
        success: false,
        error: result.error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send review request email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

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

  const itemsHtml = pieces.map(piece => {
    const stockStatus = piece.stock === 0
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
  }).join('')

  const outOfStockCount = pieces.filter(p => p.stock === 0).length
  const lowStockCount = pieces.filter(p => p.stock > 0).length

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
          Hi ${shopName},
        </p>

        <p style="margin: 0 0 20px 0; font-size: 16px;">
          The following items in your inventory need attention:
        </p>

        <!-- Summary -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          ${outOfStockCount > 0 ? `
          <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626;">${outOfStockCount}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b;">Out of Stock</p>
          </div>
          ` : ''}
          ${lowStockCount > 0 ? `
          <div style="flex: 1; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #d97706;">${lowStockCount}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">Low Stock</p>
          </div>
          ` : ''}
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
export async function sendLowStockAlertEmail(data: LowStockAlertEmailData): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    // In development mode without Resend, log to console
    console.log('[EMAIL] Low stock alert email (not sent - no Resend API key):')
    console.log(`  To: ${data.tenant.email}`)
    console.log(`  Items: ${data.pieces.length}`)
    console.log(`  Out of stock: ${data.pieces.filter(p => p.stock === 0).length}`)
    console.log(`  Low stock: ${data.pieces.filter(p => p.stock > 0).length}`)
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
 * Password reset email data
 */
export interface SendPasswordResetEmailParams {
  to: string
  resetToken: string
  businessName: string
}

/**
 * Build password reset email HTML
 */
function buildPasswordResetEmailHtml(data: SendPasswordResetEmailParams): string {
  const { resetToken, businessName } = data
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL environment variable is required for password reset emails')
  }
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f9fafb;">
  <div style="padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
      <!-- Header -->
      <div style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #111827;">MadeBuy</h1>
      </div>

      <!-- Content -->
      <div style="padding: 40px;">
        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">Reset Your Password</h2>

        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          Hi ${escapeHtml(businessName)},
        </p>

        <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #374151;">
          We received a request to reset your password for your MadeBuy account. Click the button below to create a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
        </div>

        <p style="margin: 0 0 20px; font-size: 14px; line-height: 20px; color: #6b7280;">
          Or copy and paste this link into your browser:
        </p>

        <p style="margin: 0 0 20px; font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all;">
          ${resetUrl}
        </p>

        <div style="margin: 30px 0 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; line-height: 20px; color: #92400e;">
            <strong>Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
          This email was sent from MadeBuy
        </p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} MadeBuy. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send password reset email with reset link
 */
export async function sendPasswordResetEmail(data: SendPasswordResetEmailParams): Promise<{
  success: boolean
  error?: string
}> {
  const client = getResendClient()

  if (!client) {
    // In development mode without Resend, log to console
    console.log('[EMAIL] Password reset email (not sent - no Resend API key):')
    console.log(`  To: ${data.to}`)
    console.log(`  Reset URL: ${process.env.NEXTAUTH_URL}/reset-password?token=${data.resetToken}`)
    return {
      success: true, // Return success in dev mode for testing
    }
  }

  const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@madebuy.com.au'
  const htmlContent = buildPasswordResetEmailHtml(data)

  try {
    const result = await client.emails.send({
      from: `MadeBuy <${fromEmail}>`,
      to: data.to,
      subject: 'Reset Your MadeBuy Password',
      html: htmlContent,
    })

    if (result.error) {
      console.error('Failed to send password reset email:', result.error)
      return {
        success: false,
        error: result.error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
