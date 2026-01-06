import { Resend } from 'resend'
import type { Tenant, Newsletter, NewsletterTemplate, Order } from '@madebuy/shared'
import { renderShippedEmail } from '@madebuy/shared/email'

let resend: Resend | null = null

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
  const logoUrl = tenant.brandSettings?.logo || ''

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
        ${newsletter.content}
      </div>

      ${newsletter.images && newsletter.images.length > 0 ? `
        <div style="margin-top: 20px;">
          ${newsletter.images.map(img => `
            <div style="margin-bottom: 15px;">
              <img src="${img.url}" alt="${img.altText || ''}" style="max-width: 100%; height: auto; border-radius: 8px;" />
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

      ${footer.showSocialLinks && tenant.socialLinks ? `
        <div style="margin-top: 20px;">
          ${tenant.socialLinks.instagram ? `<a href="https://instagram.com/${tenant.socialLinks.instagram}" style="color: ${colors.primary}; margin: 0 10px;">Instagram</a>` : ''}
          ${tenant.socialLinks.facebook ? `<a href="https://facebook.com/${tenant.socialLinks.facebook}" style="color: ${colors.primary}; margin: 0 10px;">Facebook</a>` : ''}
          ${tenant.socialLinks.twitter ? `<a href="https://twitter.com/${tenant.socialLinks.twitter}" style="color: ${colors.primary}; margin: 0 10px;">Twitter</a>` : ''}
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
      replyTo: data.tenant.email,
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
