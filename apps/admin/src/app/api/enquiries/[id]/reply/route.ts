import { enquiries, tenants } from '@madebuy/db'
import { escapeHtml } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getCurrentTenant } from '@/lib/session'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject, body } = await request.json()

    // Input validation
    if (!subject || !body) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 },
      )
    }

    if (typeof subject !== 'string' || typeof body !== 'string') {
      return NextResponse.json(
        { error: 'Subject and body must be strings' },
        { status: 400 },
      )
    }

    if (subject.length > 200 || body.length > 10000) {
      return NextResponse.json(
        { error: 'Subject or body exceeds maximum length' },
        { status: 400 },
      )
    }

    // Get the enquiry
    const enquiry = await enquiries.getEnquiry(tenant.id, params.id)

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    // Get full tenant data for email
    const tenantData = await tenants.getTenantById(tenant.id)
    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })
    }

    const fromEmail =
      tenantData.email ||
      process.env.DEFAULT_FROM_EMAIL ||
      'support@madebuy.com.au'
    const fromName = tenantData.businessName || 'Support'

    // Build the email HTML with XSS protection
    const safeSubject = escapeHtml(subject)
    const safeName = escapeHtml(enquiry.name)
    const safeFromName = escapeHtml(fromName)
    const safeOriginalMessage = escapeHtml(enquiry.message)
    const safeBodyHtml = body
      .split('\n')
      .map(
        (line: string) => `<p style="margin: 10px 0;">${escapeHtml(line)}</p>`,
      )
      .join('')

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <p>Hi ${safeName},</p>

    <div style="margin: 20px 0;">
      ${safeBodyHtml}
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

    <p style="color: #6b7280; font-size: 14px;">
      <strong>Your original message:</strong><br />
      ${safeOriginalMessage}
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="color: #6b7280; font-size: 12px;">
        Best regards,<br />
        ${safeFromName}
      </p>
    </div>
  </div>
</body>
</html>
    `

    // Send the email
    const client = getResendClient()

    if (!client) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 },
      )
    }

    try {
      await client.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: enquiry.email,
        subject,
        html: htmlContent,
        reply_to: fromEmail,
      })
    } catch (emailError) {
      console.error('Failed to send reply email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 },
      )
    }

    // Record the reply in the database
    const updatedEnquiry = await enquiries.replyToEnquiry(
      tenant.id,
      params.id,
      subject,
      body,
    )

    return NextResponse.json({ enquiry: updatedEnquiry })
  } catch (error) {
    console.error('Error replying to enquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
