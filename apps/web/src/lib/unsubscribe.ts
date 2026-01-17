import crypto from 'node:crypto'

/**
 * Generate unsubscribe token for an email
 * Used in email sending to create unsubscribe links
 */
export function generateUnsubscribeToken(
  email: string,
  secret: string,
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32)
}
