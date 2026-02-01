/**
 * Password Reset Email Template
 *
 * Sent to tenants when they request a password reset
 */

export interface PasswordResetData {
  tenantName: string
  tenantEmail: string
  resetLink: string
  expiresInMinutes?: number
}

// Common styles for all emails
const STYLES = {
  container:
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;',
  header:
    'background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;',
  headerTitle: 'color: white; margin: 0; font-size: 24px;',
  body: 'background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;',
  button:
    'display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;',
  infoBox:
    'background: #fef2f2; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;',
  footer: 'text-align: center; color: #999; font-size: 12px; margin-top: 20px;',
}

/**
 * Render password reset email
 */
export function renderPasswordResetEmail(data: PasswordResetData): {
  subject: string
  html: string
  text: string
} {
  const { tenantName, resetLink, expiresInMinutes = 60 } = data

  const subject = 'Reset Your MadeBuy Password'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="${STYLES.container}">
  <div style="${STYLES.header}">
    <h1 style="${STYLES.headerTitle}">Password Reset Request</h1>
  </div>

  <div style="${STYLES.body}">
    <p>Hi ${tenantName},</p>

    <p>We received a request to reset your MadeBuy account password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" style="${STYLES.button}">Reset Password</a>
    </div>

    <div style="${STYLES.infoBox}">
      <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600;">
        Security Notice
      </p>
      <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
        This link will expire in ${expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>

    <p style="color: #666; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="word-break: break-all; color: #7c3aed; font-size: 14px;">
      ${resetLink}
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

    <p style="color: #666; font-size: 14px;">
      <strong>Didn't request this?</strong><br>
      If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
    </p>
  </div>

  <p style="${STYLES.footer}">
    MadeBuy - Your Australian marketplace partner<br>
    This is an automated email, please do not reply.
  </p>
</body>
</html>
  `.trim()

  const text = `
Password Reset Request

Hi ${tenantName},

We received a request to reset your MadeBuy account password. Click the link below to create a new password:

${resetLink}

SECURITY NOTICE
This link will expire in ${expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.

DIDN'T REQUEST THIS?
If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.

---
MadeBuy - Your Australian marketplace partner
This is an automated email, please do not reply.
  `.trim()

  return { subject, html, text }
}
