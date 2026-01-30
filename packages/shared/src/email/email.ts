/**
 * Email Service
 *
 * Handles sending transactional emails via Resend
 */

import type { Order } from '../types/order'
import type { Tenant } from '../types/tenant'

export interface EmailConfig {
  apiKey: string
  fromEmail: string
  fromName?: string
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailPayload {
  to: EmailAddress | EmailAddress[]
  from: EmailAddress
  subject: string
  html: string
  text: string
  replyTo?: EmailAddress
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Email sender interface
 * Can be implemented with different providers (Resend, SendGrid, etc.)
 */
export interface EmailSender {
  send(payload: EmailPayload): Promise<EmailResult>
}

/**
 * Resend email implementation
 */
export class ResendEmailSender implements EmailSender {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: payload.from.name
            ? `${payload.from.name} <${payload.from.email}>`
            : payload.from.email,
          to: recipients.map((r) =>
            r.name ? `${r.name} <${r.email}>` : r.email,
          ),
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo
            ? payload.replyTo.name
              ? `${payload.replyTo.name} <${payload.replyTo.email}>`
              : payload.replyTo.email
            : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[Email] Resend API error:', error)
        return {
          success: false,
          error: `Resend API error: ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.id,
      }
    } catch (error) {
      console.error('[Email] Failed to send email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Email service helper functions
 */

/**
 * Create default email config from environment
 */
export function createEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured')
    return null
  }

  return {
    apiKey,
    fromEmail: process.env.EMAIL_FROM || 'noreply@madebuy.com.au',
    fromName: process.env.EMAIL_FROM_NAME || 'MadeBuy',
  }
}

/**
 * Create email sender instance
 */
export function createEmailSender(config?: EmailConfig): EmailSender | null {
  const finalConfig = config || createEmailConfig()

  if (!finalConfig) {
    return null
  }

  return new ResendEmailSender(finalConfig.apiKey)
}

/**
 * Get tenant-specific from address
 */
export function getTenantFromAddress(tenant: Tenant): EmailAddress {
  return {
    email: process.env.EMAIL_FROM || 'noreply@madebuy.com.au',
    name: tenant.businessName || 'MadeBuy',
  }
}

/**
 * Get platform from address
 */
export function getPlatformFromAddress(): EmailAddress {
  return {
    email: process.env.EMAIL_FROM || 'noreply@madebuy.com.au',
    name: process.env.EMAIL_FROM_NAME || 'MadeBuy',
  }
}
